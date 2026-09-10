import { createServer } from "node:http";
import { Pool } from "pg";
import { PostgresFakeBrokerRepository } from "./adapters/postgres-fake-broker-repository.js";
import type { HistoricalExecutionCommand } from "./domain/historical-execution.js";

const port = Number(process.env.STOCKQUANT_PORT ?? 3005);
const allowedServiceId = process.env.STOCKQUANT_ALLOWED_SERVICE_ID ?? "platform-api-service";
const portfolioUrl = process.env.STOCKQUANT_PORTFOLIO_API_URL ?? "http://127.0.0.1:3001";
const governanceUrl = process.env.STOCKQUANT_GOVERNANCE_URL ?? "http://127.0.0.1:3007";
const pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL });
const broker = new PostgresFakeBrokerRepository(pool);
const json = (response: import("node:http").ServerResponse, status: number, body: unknown) => { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(body)); };

await broker.migrate();
type FillOutbox = { event_id: string; payload: { accountId: string; namespace: string; security: string; externalFillId: string; quantity: number; price: string; fee: string; effectiveAt: string } };
async function deliverOutbox(event: FillOutbox): Promise<boolean> {
  try {
    const fill = event.payload;
    const posted = await fetch(`${portfolioUrl}/internal/v1/accounts/${fill.accountId}/fills`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service" }, body: JSON.stringify({ namespace: fill.namespace, security: fill.security, quantity: fill.quantity, price: fill.price, fee: fill.fee, currency: "CNY", effectiveAt: fill.effectiveAt, externalFillId: fill.externalFillId }) });
    if (!posted.ok) throw new Error(`portfolio fill posting failed: ${posted.status}`);
    await broker.markFillDelivered(event.event_id);
    return true;
  } catch (error) {
    await broker.markFillDeliveryFailed(event.event_id, error instanceof Error ? error.message : "portfolio posting failed");
    return false;
  }
}
const retryTimer = setInterval(async () => {
  for (const event of await broker.pendingOutbox()) await deliverOutbox(event as FillOutbox);
}, 5000);
retryTimer.unref();
createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/live") return json(response, 200, { status: "live", service: "trade-execution-service", brokerMode: "FAKE" });
  if (request.method === "GET" && request.url === "/ready") { try { await pool.query("SELECT 1"); return json(response, 200, { status: "ready", service: "trade-execution-service", brokerMode: "FAKE" }); } catch { return json(response, 503, { status: "unavailable" }); } }
  const orderMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)$/);
  const outboxMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)\/outbox$/);
  const compensateMatch = request.url?.match(/^\/internal\/v1\/outbox\/([^/]+)\/compensate$/);
  const cancelMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)\/cancel$/);
  if (request.headers["x-stockquant-service-id"] !== allowedServiceId) return json(response, 403, { error: "service identity is not allowed" });
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
    const authorization = await fetch(`${governanceUrl}/internal/v1/authorizations/validate`, { method:"POST", headers:{"content-type":"application/json","x-stockquant-service-id":"historical-replay-worker"}, body:JSON.stringify({ authorizationId:command.authorizationId, accountId:command.accountId, command:{namespace:command.namespace,accountId:command.accountId,clientOrderId:command.clientOrderId,security:command.security,requestedQuantity:command.requestedQuantity,bar:command.bar} }) });
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
  } catch (error) { return json(response, 422, { error: error instanceof Error ? error.message : "invalid command" }); }
}).listen(port, process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
