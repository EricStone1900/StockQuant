import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PostgresFakeBrokerRepository } from "./adapters/postgres-fake-broker-repository.js";
import { IdempotencyConflictError, type HistoricalExecutionCommand } from "./domain/historical-execution.js";
import { toPortfolioFillCommand, type FillOutboxPayload } from "./domain/portfolio-fill.js";
import { authorizeTradeExecutionRequest, loadTradeExecutionServiceTokens } from "./service-auth.js";
import { assessV24PaperReadiness } from "./domain/v24-paper-readiness.js";
import type { V24ExecutionPolicy } from "./domain/v24-execution-policy.js";
import type { V24PaperMandatePreparation } from "./domain/v24-mandate-readiness.js";

const port = Number(process.env.STOCKQUANT_PORT ?? 3005);
const portfolioUrl = process.env.STOCKQUANT_PORTFOLIO_API_URL ?? "http://127.0.0.1:3001";
const portfolioToken = process.env.STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION ?? "";
const governanceUrl = process.env.STOCKQUANT_GOVERNANCE_URL ?? "http://127.0.0.1:3007";
const pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL });
const broker = new PostgresFakeBrokerRepository(pool);
let callerTokens: ReturnType<typeof loadTradeExecutionServiceTokens>;
try { callerTokens = loadTradeExecutionServiceTokens(process.env); } catch (error) { console.error(error instanceof Error ? error.message : "invalid trade execution caller credentials"); process.exit(1); }
const json = (response: import("node:http").ServerResponse, status: number, body: unknown) => { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(body)); };

function readV24ReadinessInputs() {
  const policyPath = fileURLToPath(new URL("../../../packages/contracts/fixtures/v24-paper-execution-policy-v1.json", import.meta.url));
  const mandatePath = fileURLToPath(new URL("../../../packages/contracts/fixtures/v24-paper-mandate-preparation-v1.json", import.meta.url));
  return {
    policy: JSON.parse(readFileSync(policyPath, "utf8")) as V24ExecutionPolicy,
    mandate: JSON.parse(readFileSync(mandatePath, "utf8")) as V24PaperMandatePreparation,
  };
}

await broker.migrate();
type FillOutbox = { event_id: string; payload: FillOutboxPayload };
async function deliverOutbox(event: FillOutbox): Promise<boolean> {
  const claim = await broker.claimOutbox(event.event_id);
  if (!claim) return false;
  try {
    const fill = claim.payload as FillOutboxPayload;
    const posted = await fetch(`${portfolioUrl}/internal/v1/accounts/${fill.accountId}/fills`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: `Bearer ${portfolioToken}` }, body: JSON.stringify(toPortfolioFillCommand(fill)), signal: AbortSignal.timeout(5000) });
    if (!posted.ok) throw new Error(`portfolio fill posting failed: ${posted.status}`);
    await broker.markFillDelivered(event.event_id, claim.claim_token);
    return true;
  } catch (error) {
    await broker.markFillDeliveryFailed(event.event_id, claim.claim_token, error instanceof Error ? error.message : "portfolio posting failed");
    return false;
  }
}
let outboxPollRunning = false;
const retryTimer = setInterval(() => {
  if (outboxPollRunning) return;
  outboxPollRunning = true;
  void (async () => {
    try {
      for (const event of await broker.pendingOutbox()) await deliverOutbox(event as FillOutbox);
    } catch {
      console.error("FakeBroker Outbox poll failed; the next bounded poll will retry");
    } finally {
      outboxPollRunning = false;
    }
  })();
}, 5000);
retryTimer.unref();
createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/live") return json(response, 200, { status: "live", service: "trade-execution-service", brokerMode: "FAKE" });
  if (request.method === "GET" && request.url === "/ready") { try { if (portfolioToken.length < 32) return json(response, 503, { status: "unavailable", reason: "portfolio bearer credential is not configured" }); await pool.query("SELECT 1"); return json(response, 200, { status: "ready", service: "trade-execution-service", brokerMode: "FAKE" }); } catch { return json(response, 503, { status: "unavailable" }); } }
  const orderMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)$/);
  const reconciliationMatch = request.url?.match(/^\/internal\/v1\/reconciliation\/summary\?namespace=([^&]+)$/);
  const outboxMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)\/outbox$/);
  const compensateMatch = request.url?.match(/^\/internal\/v1\/outbox\/([^/]+)\/compensate$/);
  const cancelMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)\/cancel$/);
  const pathname = request.url?.split("?", 1)[0] ?? "";
  const serviceHeader = request.headers["x-stockquant-service-id"];
  const authorizationHeader = request.headers.authorization;
  if (!authorizeTradeExecutionRequest({ method: request.method ?? "", pathname, serviceId: typeof serviceHeader === "string" ? serviceHeader : undefined, authorization: typeof authorizationHeader === "string" ? authorizationHeader : undefined, tokens: callerTokens })) return json(response, 403, { error: "service identity or route scope is not allowed" });
  if (request.method === "GET" && pathname === "/internal/v1/v24/paper-readiness") {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
    const market = url.searchParams.get("market");
    if (market !== "CN_A" && market !== "US_EQUITY") return json(response, 400, { error: "market must be CN_A or US_EQUITY" });
    try {
      const inputs = readV24ReadinessInputs();
      return json(response, 200, assessV24PaperReadiness({ ...inputs, market }));
    } catch {
      return json(response, 503, { error: "V2.4 readiness policy contracts are unavailable" });
    }
  }
  if (request.method === "GET" && reconciliationMatch) return json(response, 200, await broker.reconciliationSummary(decodeURIComponent(reconciliationMatch[1])));
  if (request.method === "GET" && orderMatch) { const order = await broker.find(orderMatch[1]); return order ? json(response, 200, order) : json(response, 404, { error:"order not found" }); }
  if (request.method === "GET" && outboxMatch) { const event = await broker.outboxStatus(outboxMatch[1]); return json(response, 200, event ?? { state: "EMPTY" }); }
  if (request.method === "POST" && compensateMatch) {
    const event = await broker.requeueOutbox(compensateMatch[1]);
    if (!event) return json(response, 409, { error: "outbox event is not awaiting compensation" });
    const delivered = await deliverOutbox(event as any);
    return json(response, delivered ? 200 : 202, { eventId: event.event_id, status: delivered ? "DELIVERED" : "COMPENSATION_REQUIRED" });
  }
  if (request.method === "POST" && cancelMatch) { const order = await broker.cancel(cancelMatch[1]); return order ? json(response, 202, order) : json(response, 404, { error:"order not found" }); }
  const expireMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)\/(expire|unknown)$/);
  if (request.method === "POST" && expireMatch) { const order = await broker.transition(expireMatch[1], expireMatch[2] === "expire" ? "EXPIRED" : "UNKNOWN", expireMatch[2] === "expire" ? "DAY_WINDOW_CLOSED" : "VENUE_TIMEOUT"); return order ? json(response, 202, order) : json(response, 409, { error:"order is already terminal or not found" }); }
  if (request.method !== "POST" || request.url !== "/internal/v1/historical-orders/execute") return json(response, 404, { error: "not found" });
  let raw = ""; for await (const chunk of request) raw += chunk;
  try {
    const command = JSON.parse(raw) as HistoricalExecutionCommand & { authorizationId?: string };
    const authorization = await fetch(`${governanceUrl}/internal/v1/authorizations/validate`, { method:"POST", headers:{"content-type":"application/json","x-stockquant-service-id":"trade-execution-service",authorization:`Bearer ${process.env.STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION ?? ""}`}, body:JSON.stringify({ authorizationId:command.authorizationId, accountId:command.accountId, command:{namespace:command.namespace,accountId:command.accountId,clientOrderId:command.clientOrderId,security:command.security,requestedQuantity:command.requestedQuantity,bar:command.bar} }) });
    if (!authorization.ok) return json(response, 403, { error:"valid governance authorization is required" });
    const execution = await broker.execute(command);
    // Posting is deliberately retried for replayed orders too: the portfolio
    // ledger's external-fill key makes recovery safe if a prior response was
    // lost after FakeBroker persistence.
    if (execution.result.fill) {
      const outbox = await broker.pendingFill(execution.result.orderId);
      // The outbox is written in the same transaction as the FakeBroker fill.
      // A replay therefore retries only an undelivered ledger event; delivered
      // events remain auditable and cannot double-post to the portfolio.
      if (outbox) {
        const delivered = await deliverOutbox({ event_id: outbox.event_id, payload: { ...(outbox.payload as any), accountId: command.accountId, namespace: command.namespace, security: command.security } });
        if (!delivered) throw new Error("portfolio fill posting failed; outbox retry scheduled");
      }
    }
    return json(response, 200, execution);
  } catch (error) { return json(response, error instanceof IdempotencyConflictError ? error.statusCode : 422, { error: error instanceof Error ? error.message : "invalid command" }); }
}).listen(port, process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
