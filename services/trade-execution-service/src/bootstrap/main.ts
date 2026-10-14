import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PostgresFakeBrokerRepository } from "../adapters/postgres-fake-broker-repository.js";
import { PostgresSimulationExecutionPolicyRepository } from "../adapters/postgres-simulation-execution-policy-repository.js";
import { migrateTradeExecutionSchema } from "../adapters/postgres-schema-migrations.js";
import { FillOutboxDelivery } from "../application/fill-outbox-delivery.js";
import { IdempotencyConflictError, type HistoricalExecutionCommand, type SnapshotPaperExecutionCommand } from "../domain/historical-execution.js";
import { authorizeTradeExecutionRequest, loadTradeExecutionServiceTokens } from "../service-auth.js";
import { assessV24PaperReadiness } from "../domain/v24-paper-readiness.js";
import type { V24ExecutionPolicy } from "../domain/v24-execution-policy.js";
import type { V24PaperMandatePreparation } from "../domain/v24-mandate-readiness.js";
import { evaluateV24PaperFixtureGrant, fixtureClock, type V24PaperExecutionGrant } from "../domain/v24-paper-execution.js";
import { GeneratedPortfolioAccountClient, PortfolioAccountClientError } from "../contracts/generated-portfolio-account-client.js";
import { GeneratedPaperAuthorizationClient } from "../contracts/generated-paper-authorization-client.js";
import { GeneratedReplayGovernanceClient } from "../contracts/generated-replay-governance-client.js";
import { GeneratedTradeV13GovernanceClient } from "../contracts/generated-v13-governance-client.js";
import { V13ManualPaperExecutionError, V13ManualPaperExecutionService, V13AutoPaperExecutionService, type V13ManualExecutionFaults } from "../application/v13-manual-paper-execution.js";
import { GeneratedTradeV13AutoMandateClient } from "../contracts/generated-v13-auto-mandate-client.js";

const port = Number(process.env.STOCKQUANT_PORT ?? 3005);
const portfolioUrl = process.env.STOCKQUANT_PORTFOLIO_API_URL ?? "http://127.0.0.1:3001";
const portfolioToken = process.env.STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION ?? "";
const portfolioClient = new GeneratedPortfolioAccountClient(portfolioUrl, "trade-execution-service", portfolioToken);
const governanceUrl = process.env.STOCKQUANT_GOVERNANCE_URL ?? "http://127.0.0.1:3007";
const paperAuthorizationClient = new GeneratedPaperAuthorizationClient(governanceUrl, process.env.STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION ?? "");
const replayGovernanceClient = new GeneratedReplayGovernanceClient(governanceUrl, process.env.STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION ?? "");
const v13GovernanceClient = new GeneratedTradeV13GovernanceClient(governanceUrl, process.env.STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION ?? "");
const v13AutoMandateClient = new GeneratedTradeV13AutoMandateClient(governanceUrl, process.env.STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION ?? "");
const pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL });
pool.on("error", (error: Error & { code?: string }) => {
  console.warn(`STOCKQUANT_TRADE_DATABASE_IDLE_CLIENT_ERROR name=${error.name} code=${error.code ?? "none"}`);
});
const broker = new PostgresFakeBrokerRepository(pool);
const simulationPolicies = new PostgresSimulationExecutionPolicyRepository(pool);
let callerTokens: ReturnType<typeof loadTradeExecutionServiceTokens>;
try { callerTokens = loadTradeExecutionServiceTokens(process.env); } catch (error) { console.error(error instanceof Error ? error.message : "invalid trade execution caller credentials"); process.exit(1); }
const json = (response: import("node:http").ServerResponse, status: number, body: unknown) => { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(body)); };
async function hasEmptyRequestBody(request: import("node:http").IncomingMessage): Promise<boolean> {
  let byteLength = 0;
  for await (const chunk of request) {
    byteLength += Buffer.byteLength(chunk);
    if (byteLength > 8192) return false;
  }
  return byteLength === 0;
}
function hasOnlyKeys(value: object, allowed: readonly string[], required: readonly string[]): boolean {
  const keys = Object.keys(value);
  return required.every((key) => Object.hasOwn(value, key)) && keys.every((key) => allowed.includes(key));
}

function readV24ReadinessInputs() {
  const policyPath = fileURLToPath(new URL("../../../../packages/contracts/fixtures/v24-paper-execution-policy-v1.json", import.meta.url));
  const mandatePath = fileURLToPath(new URL("../../../../packages/contracts/fixtures/v24-paper-mandate-preparation-v1.json", import.meta.url));
  return {
    policy: JSON.parse(readFileSync(policyPath, "utf8")) as V24ExecutionPolicy,
    mandate: JSON.parse(readFileSync(mandatePath, "utf8")) as V24PaperMandatePreparation,
  };
}

await migrateTradeExecutionSchema(pool);
const initialReadinessInputs = readV24ReadinessInputs();
await simulationPolicies.savePreparationPolicy(initialReadinessInputs.policy);
const injectedFeeCorrectionFaults = new Set<string>();
const fillOutboxDelivery = new FillOutboxDelivery(broker, portfolioClient, {
  beforeFeeCorrectionDelivery(eventId, value) {
    const correction = value as { evidenceRef?: unknown; revision?: unknown };
    if (process.env.STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED !== "true" || typeof correction.evidenceRef !== "string" || !correction.evidenceRef.startsWith("v13-fee-correction:") || correction.revision !== 1 || injectedFeeCorrectionFaults.has(eventId)) return;
    injectedFeeCorrectionFaults.add(eventId);
    console.info(JSON.stringify({ faultScenario: "V13_FEE_CORRECTION_PORTFOLIO_POST_REJECTED_ONCE", eventId, evidenceRef: correction.evidenceRef, eventSequence: 1 }));
    throw new Error("V13_TEST_FEE_CORRECTION_PORTFOLIO_POST_REJECTED_ONCE");
  },
});
const injectedManualMultiLegRestartFaults = new Set<string>();
const v13ManualMultiLegFaults: V13ManualExecutionFaults = {
  async afterFirstMultiLegChildCommit(command, childClientOrderId) {
    const delayMs = Number(process.env.STOCKQUANT_V13_TEST_MANUAL_MULTILEG_RESTART_DELAY_MS ?? "0");
    if (!Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs > 30_000) throw new Error("V1.3 MANUAL multi-leg restart delay must be an integer from 0 to 30000 milliseconds");
    if (process.env.STOCKQUANT_V13_TEST_FAULTS_ENABLED !== "true" || delayMs === 0 || !command.clientOrderId.startsWith("v13-fault-multileg-restart-")) return;
    if (process.env.STOCKQUANT_LIVE_TRADING_ENABLED !== "false" || process.env.STOCKQUANT_BROKER_MODE !== "FAKE") throw new Error("V1.3 MANUAL multi-leg restart injection is allowed only with LIVE disabled and FakeBroker selected");
    const key = `${command.namespace}:${command.clientOrderId}`;
    if (injectedManualMultiLegRestartFaults.has(key)) return;
    injectedManualMultiLegRestartFaults.add(key);
    console.info(JSON.stringify({ faultScenario: "V13_MANUAL_MULTILEG_FIRST_CHILD_COMMITTED_BEFORE_TRADE_RESTART", testRunId: command.testRunId, clientOrderId: command.clientOrderId, childClientOrderId, eventSequence: 1 }));
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  },
};
const v13ManualPaperExecution = new V13ManualPaperExecutionService(broker, portfolioClient, v13GovernanceClient, fillOutboxDelivery, v13ManualMultiLegFaults);
const injectedAutoFaultPhases = new Map<string, number>();
const v13AutoPaperExecution = new V13AutoPaperExecutionService(broker, portfolioClient, v13GovernanceClient, v13AutoMandateClient, fillOutboxDelivery, {
  async afterMandateAuthorization(command) {
    const delayMs = Number(process.env.STOCKQUANT_V15_TEST_PAUSE_AFTER_AUTHORIZATION_DELAY_MS ?? "0");
    if (!Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs > 30_000) throw new Error("V1.5 test pause-after-authorization delay must be an integer from 0 to 30000 milliseconds");
    if (delayMs === 0 || !command.clientOrderId.startsWith("v15-auto-CN_A-")) return;
    if (process.env.STOCKQUANT_LIVE_TRADING_ENABLED !== "false" || process.env.STOCKQUANT_BROKER_MODE !== "FAKE") throw new Error("V1.5 in-flight pause test hook is allowed only with LIVE disabled and FakeBroker selected");
    console.info(JSON.stringify({ faultScenario: "V15_PAUSE_AFTER_MANDATE_AUTHORIZATION", testRunId: command.testRunId, market: "CN_A", mandateId: command.mandateId, mandateVersion: command.mandateVersion, ownerId: command.ownerId, accountId: command.accountId, namespace: command.namespace, proposalId: command.proposalId, clientOrderId: command.clientOrderId, now: command.now, eventSequence: 1 }));
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  },
  async afterFakeBrokerCommit(command) {
    const restartDelayMs = Number(process.env.STOCKQUANT_V15_TEST_AUTO_COMMIT_RESTART_DELAY_MS ?? "0");
    if (!Number.isSafeInteger(restartDelayMs) || restartDelayMs < 0 || restartDelayMs > 30_000) throw new Error("V1.5 AUTO Trade restart delay must be an integer from 0 to 30000 milliseconds");
    const restartAfterCommit = process.env.STOCKQUANT_V13_TEST_FAULTS_ENABLED === "true" && restartDelayMs > 0 && command.clientOrderId.startsWith("v15-auto-CN_A-") && command.clientOrderId.endsWith("-session-2");
    if (restartAfterCommit) {
      if (process.env.STOCKQUANT_LIVE_TRADING_ENABLED !== "false" || process.env.STOCKQUANT_BROKER_MODE !== "FAKE") throw new Error("V1.5 Trade restart injection is allowed only with LIVE disabled and FakeBroker selected");
      console.info(JSON.stringify({ faultScenario: "V15_AUTO_RESPONSE_PENDING_BEFORE_TRADE_RESTART", testRunId: command.testRunId, clientOrderId: command.clientOrderId, eventSequence: 1 }));
      await new Promise((resolve) => setTimeout(resolve, restartDelayMs));
    }
    if (process.env.STOCKQUANT_V13_TEST_FAULTS_ENABLED !== "true" || (!command.clientOrderId.startsWith("v13-fault-unknown-") && !command.clientOrderId.startsWith("v13-fault-restart-"))) return;
    const key = `${command.namespace}:${command.clientOrderId}`;
    if ((injectedAutoFaultPhases.get(key) ?? 0) !== 0) return;
    injectedAutoFaultPhases.set(key, 1);
    const restartRecovery = command.clientOrderId.startsWith("v13-fault-restart-");
    console.info(JSON.stringify({ faultScenario: restartRecovery ? "AUTO_RESPONSE_LOST_BEFORE_TRADE_RESTART" : "AUTO_RESPONSE_LOST_AFTER_FAKEBROKER_COMMIT", testRunId: command.testRunId, clientOrderId: command.clientOrderId, eventSequence: 1 }));
    throw new V13ManualPaperExecutionError(503, restartRecovery ? "AUTO_TEST_FAULT_RESPONSE_LOST_BEFORE_TRADE_RESTART" : "AUTO_TEST_FAULT_RESPONSE_LOST_AFTER_FAKEBROKER_COMMIT");
  },
  async beforeOriginalOrderRead(command) {
    if (process.env.STOCKQUANT_V13_TEST_FAULTS_ENABLED === "true" && Number(process.env.STOCKQUANT_V15_TEST_AUTO_COMMIT_RESTART_DELAY_MS ?? "0") > 0 && command.clientOrderId.startsWith("v15-auto-CN_A-") && command.clientOrderId.endsWith("-session-2")) {
      console.info(JSON.stringify({ faultScenario: "V15_AUTO_ORIGINAL_ORDER_LOOKUP_AFTER_TRADE_RESTART", testRunId: command.testRunId, clientOrderId: command.clientOrderId, eventSequence: 2 }));
    }
    if (process.env.STOCKQUANT_V13_TEST_FAULTS_ENABLED !== "true" || !command.clientOrderId.startsWith("v13-fault-unknown-")) return;
    const key = `${command.namespace}:${command.clientOrderId}`;
    if (injectedAutoFaultPhases.get(key) !== 1) return;
    injectedAutoFaultPhases.set(key, 2);
    console.info(JSON.stringify({ faultScenario: "AUTO_ORIGINAL_ORDER_QUERY_UNAVAILABLE_ONCE", testRunId: command.testRunId, clientOrderId: command.clientOrderId, eventSequence: 2 }));
    throw new V13ManualPaperExecutionError(503, "AUTO_TEST_FAULT_ORIGINAL_ORDER_QUERY_UNAVAILABLE_ONCE");
  },
});
let outboxPollRunning = false;
const retryTimer = setInterval(() => {
  if (outboxPollRunning) return;
  outboxPollRunning = true;
  void (async () => {
    try {
      await fillOutboxDelivery.drainPending();
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
  const historicalOrderMatch = request.url?.match(/^\/internal\/v1\/historical-orders\/([^/?]+)\?namespace=([^&]+)$/);
  const orderMatch = request.url?.match(/^\/internal\/v1\/orders\/(?!by-client-id(?:\?|$))([^/]+)$/);
  const reconciliationMatch = request.url?.match(/^\/internal\/v1\/reconciliation\/summary\?namespace=([^&]+)$/);
  const outboxMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)\/outbox$/);
  const compensateMatch = request.url?.match(/^\/internal\/v1\/outbox\/([^/]+)\/compensate$/);
  const cancelMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)\/cancel$/);
  const cancelResultMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)\/cancel-result$/);
  const feeCorrectionMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)\/fills\/([^/]+)\/fee-corrections$/);
  const simulatedFillReportMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)\/simulated-fill-reports$/);
  const simulatedExternalOrderPath = "/internal/v1/fake-broker/external-orders";
  const pathname = request.url?.split("?", 1)[0] ?? "";
  const serviceHeader = request.headers["x-stockquant-service-id"];
  const authorizationHeader = request.headers.authorization;
  if (!authorizeTradeExecutionRequest({ method: request.method ?? "", pathname, serviceId: typeof serviceHeader === "string" ? serviceHeader : undefined, authorization: typeof authorizationHeader === "string" ? authorizationHeader : undefined, tokens: callerTokens })) return json(response, 403, { error: "service identity or route scope is not allowed" });
  if (request.method === "GET" && historicalOrderMatch) {
    const order = await broker.findHistoricalOrderById(decodeURIComponent(historicalOrderMatch[1]!), decodeURIComponent(historicalOrderMatch[2]!));
    return order ? json(response, 200, order) : json(response, 404, { error: "historical order not found in namespace" });
  }
  if (request.method === "GET" && pathname === "/internal/v1/v24/paper-readiness") {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
    const market = url.searchParams.get("market");
    if (market !== "CN_A" && market !== "US_EQUITY") return json(response, 400, { error: "market must be CN_A or US_EQUITY" });
    try {
      const policy = await simulationPolicies.load(initialReadinessInputs.policy.policyId, initialReadinessInputs.policy.policyVersion);
      if (!policy) return json(response, 503, { error: "V2.4 simulation policy is not persisted" });
      const inputs = readV24ReadinessInputs();
      return json(response, 200, assessV24PaperReadiness({ ...inputs, policy, market }));
    } catch {
      return json(response, 503, { error: "V2.4 readiness policy contracts are unavailable" });
    }
  }
  if (request.method === "GET" && pathname === "/internal/v1/v13/accounts/assets") {
    const query = new URL(request.url ?? "/", `http://127.0.0.1:${port}`).searchParams;
    const namespace = query.get("namespace"); const accountId = query.get("accountId");
    if (!namespace || !accountId) return json(response, 422, { error: "namespace and accountId are required" });
    const assets = await broker.independentAssetSnapshot(namespace, accountId);
    return assets ? json(response, 200, assets) : json(response, 404, { error: "independent FakeBroker assets not found" });
  }
  if (request.method === "POST" && pathname === "/internal/v1/v13/accounts/settlements") {
    let raw = "";
    for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw, "utf8") > 4096) return json(response, 413, { error: "V1.3 settlement command exceeds 4 KiB" }); }
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw) as Record<string, unknown>; } catch { return json(response, 422, { error: "valid JSON body is required" }); }
    if (!body || Array.isArray(body) || Object.keys(body).sort().join(",") !== "accountId,asOf,namespace,ownerId,testRunId" || Object.values(body).some((value) => typeof value !== "string" || !value.trim()) || !Number.isFinite(Date.parse(String(body.asOf)))) return json(response, 422, { error: "V1.3 settlement owner/TestRun scope and ISO clock are required" });
    try {
      await v13ManualPaperExecution.settleForSession({ accountId: String(body.accountId), namespace: String(body.namespace), now: String(body.asOf), ownerId: String(body.ownerId), testRunId: String(body.testRunId) });
      return json(response, 200, { status: "SETTLED", asOf: body.asOf });
    } catch (error) {
      if (error instanceof V13ManualPaperExecutionError) return json(response, error.statusCode, { error: error.message });
      return json(response, 503, { error: "V1.3 settlement could not be completed on both independent books; retry is safe" });
    }
  }
  if (request.method === "GET" && reconciliationMatch) return json(response, 200, await broker.reconciliationSummary(decodeURIComponent(reconciliationMatch[1])));
  if (request.method === "POST" && (pathname === "/internal/v1/v13/paper-orders/execute-manual-proposal" || pathname === "/internal/v1/v13/paper-orders/execute-manual-sequenced-proposal")) {
    const sequenced = pathname.endsWith("execute-manual-sequenced-proposal");
    let raw = "";
    for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw, "utf8") > 8192) return json(response, 413, { error: "V1.3 manual execution command exceeds 8 KiB" }); }
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw) as Record<string, unknown>; } catch { return json(response, 422, { error: "valid JSON body is required" }); }
    if (!body || Array.isArray(body) || Object.keys(body).sort().join(",") !== "accountId,clientOrderId,namespace,now,ownerId,proposalId,testRunId" || Object.values(body).some((value) => typeof value !== "string" || !value.trim())) return json(response, 422, { error: "V1.3 execution scope fields are invalid" });
    try {
      const result = sequenced
        ? await v13ManualPaperExecution.executeSequenced(body as { accountId: string; clientOrderId: string; namespace: string; now: string; ownerId: string; proposalId: string; testRunId: string })
        : await v13ManualPaperExecution.execute(body as { accountId: string; clientOrderId: string; namespace: string; now: string; ownerId: string; proposalId: string; testRunId: string });
      const delivered = "outboxes" in result ? result.outboxes.every((item: any) => item?.status === "DELIVERED") : result.outbox?.status === "DELIVERED";
      return json(response, result.replayed ? 200 : delivered ? 201 : 202, { schemaVersion: "v13-manual-paper-execution-result-v1", ...result });
    } catch (error) {
      if (error instanceof V13ManualPaperExecutionError) return json(response, error.statusCode, { error: error.message, ...(error.detail ? { detail: error.detail } : {}) });
      const message = error instanceof Error ? error.message : "V1.3 manual proposal execution failed";
      if (message.startsWith("V13_")) return json(response, 422, { error: message });
      throw error;
    }
  }
  if (request.method === "POST" && pathname === "/internal/v1/v13/paper-orders/execute-auto-proposal") {
    let raw = "";
    for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw, "utf8") > 8192) return json(response, 413, { error: "V1.3 AUTO execution command exceeds 8 KiB" }); }
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw) as Record<string, unknown>; } catch { return json(response, 422, { error: "valid JSON body is required" }); }
    const fields = "accountId,clientOrderId,executionMode,mandateId,mandateVersion,namespace,now,ownerId,proposalId,testRunId";
    const legacyFields = "accountId,clientOrderId,mandateId,mandateVersion,namespace,now,ownerId,proposalId,testRunId";
    if (!body || Array.isArray(body) || ![fields, legacyFields].includes(Object.keys(body).sort().join(",")) || Object.entries(body).some(([key, value]) => key === "mandateVersion" ? !Number.isSafeInteger(value) || Number(value) < 1 : key === "executionMode" ? value !== "IMMEDIATE" && value !== "SEQUENCED" : typeof value !== "string" || !value.trim())) return json(response, 422, { error: "V1.3 AUTO execution scope fields are invalid" });
    try {
      const result = await v13AutoPaperExecution.execute(body as { accountId: string; clientOrderId: string; executionMode?: "IMMEDIATE" | "SEQUENCED"; mandateId: string; mandateVersion: number; namespace: string; now: string; ownerId: string; proposalId: string; testRunId: string });
      return json(response, result.replayed ? 200 : result.order ? result.outbox?.status === "DELIVERED" ? 201 : 202 : 200, { schemaVersion: "v13-auto-paper-execution-result-v1", executionMode: body.executionMode ?? "IMMEDIATE", ...result });
    } catch (error) {
      if (error instanceof V13ManualPaperExecutionError) return json(response, error.statusCode, { error: error.message, ...(error.detail ? { detail: error.detail } : {}) });
      const message = error instanceof Error ? error.message : "V1.3 AUTO execution failed";
      if (message.startsWith("V13_")) return json(response, 422, { error: message });
      throw error;
    }
  }
  if (request.method === "POST" && pathname === simulatedExternalOrderPath) {
    let raw = "";
    for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw, "utf8") > 8192) return json(response, 413, { error: "FakeBroker external order exceeds 8 KiB" }); }
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json(response, 422, { error: "valid JSON body is required" }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json(response, 422, { error: "external order fields are required" });
    const order = body as { namespace?: unknown; externalOrderId?: unknown; clientOrderId?: unknown; security?: unknown; requestedQuantity?: unknown; status?: unknown; evidenceRef?: unknown; observedAt?: unknown };
    if (Object.keys(body).sort().join(",") !== "evidenceRef,externalOrderId,namespace,observedAt,requestedQuantity,security,status" && Object.keys(body).sort().join(",") !== "clientOrderId,evidenceRef,externalOrderId,namespace,observedAt,requestedQuantity,security,status" ||
      typeof order.namespace !== "string" || !order.namespace.trim() || order.namespace.length > 128 || typeof order.externalOrderId !== "string" || !order.externalOrderId.trim() || order.externalOrderId.length > 128 ||
      (order.clientOrderId !== undefined && (typeof order.clientOrderId !== "string" || !order.clientOrderId.trim() || order.clientOrderId.length > 128)) || typeof order.security !== "string" || !order.security.trim() || order.security.length > 64 ||
      !Number.isSafeInteger(order.requestedQuantity) || (order.requestedQuantity as number) < 1 || typeof order.status !== "string" || !["NEW","PARTIALLY_FILLED","FILLED","CANCELLED","REJECTED","UNKNOWN"].includes(order.status) ||
      typeof order.evidenceRef !== "string" || !order.evidenceRef.trim() || order.evidenceRef.length > 512 || typeof order.observedAt !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(order.observedAt) || !Number.isFinite(Date.parse(order.observedAt))) return json(response, 422, { error: "invalid simulated external order" });
    try { const result = await broker.recordSimulatedExternalOrder(order as { namespace: string; externalOrderId: string; clientOrderId?: string; security: string; requestedQuantity: number; status: string; evidenceRef: string; observedAt: string }); return json(response, result.replayed ? 200 : 201, result); }
    catch (error) { if (error instanceof Error && error.message === "SIMULATED_EXTERNAL_ORDER_CONFLICT") return json(response, 409, { error: error.message }); throw error; }
  }
  if (request.method === "GET" && orderMatch) { const order = await broker.find(orderMatch[1]); return order ? json(response, 200, order) : json(response, 404, { error:"order not found" }); }
  if (request.method === "GET" && pathname === "/internal/v1/orders/by-client-id") {
    const query = new URL(request.url ?? "/", `http://127.0.0.1:${port}`).searchParams;
    const namespace = query.get("namespace");
    const clientOrderId = query.get("clientOrderId");
    if (!namespace || !clientOrderId) return json(response, 422, { error: "namespace and clientOrderId are required" });
    const order = await broker.findByNamespaceClientOrderId(namespace, clientOrderId);
    return order ? json(response, 200, {
      order: { order_id: order.order_id, status: order.status, rejection_reason: order.rejection_reason, clientOrderId: order.client_order_id },
      orderSide: order.payload?.side ?? "BUY",
      fill: order.external_fill_id ? { externalFillId: order.external_fill_id, quantity: Number(order.fill_quantity), price: order.fill_price, fee: order.fill_fee, effectiveAt: order.effective_at.toISOString() } : null,
      fills: order.fills ?? [],
      feeCorrectionOutbox: order.fee_correction_event_id ? { event_id: order.fee_correction_event_id, event_type: "FEE_CORRECTION", status: order.fee_correction_outbox_status, attempts: order.fee_correction_outbox_attempts, last_error: order.fee_correction_outbox_last_error, delivered_at: order.fee_correction_outbox_delivered_at?.toISOString() ?? null } : null,
      outbox: order.event_id ? { event_id: order.event_id, event_type: order.event_type, status: order.outbox_status, attempts: order.attempts, delivered_at: order.delivered_at?.toISOString() ?? null } : null,
      authorization: order.payload?.testRunId ? { status: "AUTHORIZED", testRunId: order.payload.testRunId, ownerId: order.payload.ownerId, accountId: order.payload.accountId, proposalId: order.payload.proposalId, proposalVersion: order.payload.proposalVersion, contentHash: order.payload.contentHash, commandHash: order.payload.commandHash, mandateId: order.payload.mandateId, mandateVersion: order.payload.mandateVersion, strategyVersion: order.payload.strategyVersion } : undefined,
      riskEvaluation: Number.isFinite(Number(order.payload?.quoteAgeSeconds)) ? { status: "PASS_RISK_CHECK", quoteAgeSeconds: Number(order.payload.quoteAgeSeconds), deviationBps: Number(order.payload.deviationBps) } : undefined,
      eligibility: order.payload?.snapshotId ? { status: "ELIGIBLE", snapshotId: order.payload.snapshotId, executionModel: "SNAPSHOT", policyVersion: order.payload.policyVersion, dataMode: "FIXTURE", liquidityParticipation: "NOT_VERIFIED" } : undefined
    }) : json(response, 404, { error: "order not found" });
  }
  if (request.method === "GET" && outboxMatch) { const event = await broker.outboxStatus(outboxMatch[1]); return json(response, 200, event ?? { state: "EMPTY" }); }
  if (request.method === "POST" && compensateMatch) {
    if (!await hasEmptyRequestBody(request)) return json(response, 422, { error: "FakeBroker Outbox compensation request does not accept a body" });
    const event = await broker.requeueOutbox(compensateMatch[1]);
    if (!event) return json(response, 409, { error: "outbox event is not awaiting compensation" });
    const delivered = event.event_type === "RESERVATION_RESOLVE"
      ? await fillOutboxDelivery.deliverReservationResolution(event.event_id)
      : event.event_type === "FEE_CORRECTION"
        ? await fillOutboxDelivery.deliverFeeCorrection(event.event_id)
        : await fillOutboxDelivery.deliver(event.event_id);
    return json(response, delivered ? 200 : 202, { eventId: event.event_id, status: delivered ? "DELIVERED" : "COMPENSATION_REQUIRED" });
  }
  if (request.method === "POST" && cancelMatch) {
    if (!await hasEmptyRequestBody(request)) return json(response, 422, { error: "FakeBroker cancellation request does not accept a body" });
    const order = await broker.cancel(cancelMatch[1]); return order ? json(response, 202, order) : json(response, 404, { error:"order not found" });
  }
  if (request.method === "POST" && cancelResultMatch) {
    let raw = "";
    for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw, "utf8") > 8192) return json(response, 413, { error: "FakeBroker cancel result exceeds 8 KiB" }); }
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json(response, 422, { error: "valid JSON body is required" }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json(response, 422, { error: "outcome and reason are required" });
    const result = body as { outcome?: unknown; reason?: unknown; sequence?: unknown };
    if (Object.keys(body).sort().join(",") !== "outcome,reason,sequence" || (result.outcome !== "ACCEPTED" && result.outcome !== "REJECTED") || typeof result.reason !== "string" || !result.reason.trim() || result.reason.length > 500 || !Number.isSafeInteger(result.sequence) || (result.sequence as number) < 1) return json(response, 422, { error: "outcome must be ACCEPTED or REJECTED, sequence must be positive, and reason must contain 1-500 characters" });
    try {
      const order = await broker.resolveCancellation(cancelResultMatch[1], result.outcome, result.reason, result.sequence as number);
      if (order && !order.buffered) await fillOutboxDelivery.drainPending();
      return order ? json(response, order.buffered ? 202 : 200, order) : json(response, 409, { error: "order not found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "simulated cancellation result rejected";
      if (message.startsWith("INVALID_")) return json(response, 422, { error: message });
      if (message.startsWith("FAKEBROKER_EVENT_") || message.startsWith("SIMULATED_CANCEL_")) return json(response, 409, { error: message });
      throw error;
    }
  }
  if (request.method === "POST" && simulatedFillReportMatch) {
    let raw = "";
    for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw, "utf8") > 8192) return json(response, 413, { error: "FakeBroker simulated fill report exceeds 8 KiB" }); }
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json(response, 422, { error: "valid JSON body is required" }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json(response, 422, { error: "simulated fill report fields are required" });
    const report = body as { externalFillId?: unknown; sequence?: unknown; cumulativeQuantity?: unknown; price?: unknown; fee?: unknown; effectiveAt?: unknown; evidenceRef?: unknown };
    if (Object.keys(body).sort().join(",") !== "cumulativeQuantity,effectiveAt,evidenceRef,externalFillId,fee,price,sequence" ||
      typeof report.externalFillId !== "string" || !/^[0-9a-f-]{36}$/iu.test(report.externalFillId) ||
      !Number.isSafeInteger(report.sequence) || (report.sequence as number) < 1 || !Number.isSafeInteger(report.cumulativeQuantity) || (report.cumulativeQuantity as number) < 1 ||
      typeof report.price !== "string" || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(report.price) ||
      typeof report.fee !== "string" || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(report.fee) ||
      typeof report.effectiveAt !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(report.effectiveAt) || !Number.isFinite(Date.parse(report.effectiveAt)) ||
      typeof report.evidenceRef !== "string" || !report.evidenceRef.trim() || report.evidenceRef.length > 512) return json(response, 422, { error: "invalid simulated cumulative fill report" });
    try {
      const result = await broker.recordSimulatedFillReport(simulatedFillReportMatch[1], report as { externalFillId: string; sequence: number; cumulativeQuantity: number; price: string; fee: string; effectiveAt: string; evidenceRef: string });
      if (!result.buffered) await fillOutboxDelivery.drainPending();
      return json(response, result.buffered || !result.replayed ? 202 : 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "simulated fill report rejected";
      if (message === "ORDER_NOT_FOUND") return json(response, 404, { error: message });
      if (message.startsWith("INVALID_")) return json(response, 422, { error: message });
      if (message.startsWith("SIMULATED_FILL_") || message.startsWith("FAKEBROKER_EVENT_")) return json(response, 409, { error: message });
      throw error;
    }
  }
  if (request.method === "POST" && feeCorrectionMatch) {
    let raw = "";
    for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw, "utf8") > 8192) return json(response, 413, { error: "FakeBroker fee correction exceeds 8 KiB" }); }
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json(response, 422, { error: "valid JSON body is required" }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json(response, 422, { error: "fee correction fields are required" });
    const result = body as { revision?: unknown; previousFee?: unknown; correctedFee?: unknown; effectiveAt?: unknown; evidenceRef?: unknown };
    const exactKeys = Object.keys(body).sort().join(",") === "correctedFee,effectiveAt,evidenceRef,previousFee,revision";
    if (!exactKeys || !Number.isSafeInteger(result.revision) || (result.revision as number) < 1 ||
      typeof result.previousFee !== "string" || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(result.previousFee) ||
      typeof result.correctedFee !== "string" || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(result.correctedFee) ||
      typeof result.effectiveAt !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(result.effectiveAt) || !Number.isFinite(Date.parse(result.effectiveAt)) ||
      typeof result.evidenceRef !== "string" || !result.evidenceRef.trim() || result.evidenceRef.length > 512) return json(response, 422, { error: "invalid versioned fee correction" });
    try {
      const correction = await broker.recordFeeCorrection(feeCorrectionMatch[1], {
        externalFillId: feeCorrectionMatch[2], revision: result.revision as number, previousFee: result.previousFee,
        correctedFee: result.correctedFee, effectiveAt: result.effectiveAt, evidenceRef: result.evidenceRef,
      });
      return json(response, correction.replayed ? 200 : 202, correction);
    } catch (error) {
      const message = error instanceof Error ? error.message : "fee correction rejected";
      if (message === "ORDER_NOT_FOUND" || message === "FILL_NOT_FOUND") return json(response, 404, { error: message });
      if (message.startsWith("INVALID_")) return json(response, 422, { error: message });
      if (message.startsWith("FEE_CORRECTION_") || message === "FILL_POST_NOT_DELIVERED") return json(response, 409, { error: message });
      throw error;
    }
  }
  const expireMatch = request.url?.match(/^\/internal\/v1\/orders\/([^/]+)\/(expire|unknown)$/);
  if (request.method === "POST" && expireMatch) {
    if (!await hasEmptyRequestBody(request)) return json(response, 422, { error: "FakeBroker order transition request does not accept a body" });
    const order = await broker.transition(expireMatch[1], expireMatch[2] === "expire" ? "EXPIRED" : "UNKNOWN", expireMatch[2] === "expire" ? "DAY_WINDOW_CLOSED" : "VENUE_TIMEOUT"); return order ? json(response, 202, order) : json(response, 409, { error:"order is already terminal or not found" });
  }
  if (request.method === "POST" && pathname === "/internal/v1/v24/paper-orders/execute-snapshot") {
    let raw = "";
    for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw, "utf8") > 65536) return json(response, 413, { error: "Paper Fixture command exceeds 64 KiB" }); }
    try {
      const body = JSON.parse(raw) as { authorizationId?: unknown; grant?: V24PaperExecutionGrant };
      if (typeof body.authorizationId !== "string" || !body.grant || typeof body.grant !== "object") return json(response, 422, { error: "authorizationId and grant are required" });
      const grant = body.grant;
      const evaluation = evaluateV24PaperFixtureGrant(grant, fixtureClock(grant.clockNow));
      if (evaluation.status !== "ELIGIBLE") return json(response, evaluation.status === "WAITING" ? 409 : 422, { error: evaluation.reason, evaluation });
      const authorized = await paperAuthorizationClient.validateV24PaperFixtureRun({ authorizationId: body.authorizationId, accountId: grant.accountId, command: grant } as never);
      if (!authorized.ok) return json(response, 403, { error: "Governance Paper grant is missing, expired or does not match the exact command" });
      let reservationBody: Awaited<ReturnType<typeof portfolioClient.reserveAccountResources>>;
      try {
        reservationBody = await portfolioClient.reserveAccountResources(grant.accountId, {
          namespace: grant.namespace,
          testRunId: grant.testRunId,
          ownerId: grant.ownerId,
          idempotencyKey: `${grant.order.clientOrderId}-resource`,
          clientOrderId: grant.order.clientOrderId,
          side: "BUY",
          currency: grant.currency,
          cashAmount: evaluation.reservedCash,
          security: null,
          quantity: null,
        });
      } catch (error) {
        if (!(error instanceof PortfolioAccountClientError)) throw error;
        return json(response, error.status === 409 ? 409 : 503, { error: "Portfolio resource reservation failed", detail: error.body });
      }
      if (!reservationBody.reservation.reservationId) return json(response, 503, { error: "Portfolio resource reservation response is incomplete" });
      const command: SnapshotPaperExecutionCommand = {
        namespace: grant.namespace, accountId: grant.accountId, clientOrderId: grant.order.clientOrderId, security: grant.order.security,
        requestedQuantity: grant.order.requestedQuantity, price: evaluation.snapshot.price, fee: grant.fee, effectiveAt: evaluation.snapshot.observedAt,
        currency: grant.currency, snapshotId: evaluation.snapshot.snapshotId, policyVersion: evaluation.policyVersion, fixtureVersion: grant.scenarioVersion,
        quoteAgeSeconds: evaluation.risk.quoteAgeSeconds, deviationBps: evaluation.risk.deviationBps, testRunId: grant.testRunId, ownerId: grant.ownerId,
        mandateId: grant.mandate.mandateId, mandateVersion: grant.mandate.mandateVersion, strategyVersion: grant.mandate.strategyVersion,
        reservation: { reservationId: reservationBody.reservation.reservationId, ownerId: grant.ownerId, testRunId: grant.testRunId, clientOrderId: grant.order.clientOrderId }
      };
      const executed = await broker.executeSnapshotPaper(command);
      const pending = await broker.pendingFill(executed.result.orderId);
      if (pending) await fillOutboxDelivery.deliver(pending.event_id);
      const order = await broker.find(executed.result.orderId);
      const outbox = await broker.outboxStatus(executed.result.orderId);
      return json(response, executed.replayed ? 200 : outbox?.status === "DELIVERED" ? 201 : 202, {
        schemaVersion: "v24-paper-execution-result-v2", replayed: executed.replayed,
        authorization: { status: "AUTHORIZED", testRunId: grant.testRunId, ownerId: grant.ownerId, mandateId: grant.mandate.mandateId, mandateVersion: grant.mandate.mandateVersion, strategyVersion: grant.mandate.strategyVersion },
        riskEvaluation: { status: "PASS_RISK_CHECK", ...evaluation.risk }, resourceReservation: reservationBody.reservation,
        eligibility: { status: "ELIGIBLE", snapshotId: evaluation.snapshot.snapshotId, executionModel: evaluation.executionModel, policyVersion: evaluation.policyVersion, dataMode: "FIXTURE", liquidityParticipation: "NOT_VERIFIED" },
        order: { ...order, clientOrderId: grant.order.clientOrderId }, fill: executed.result.fill ?? null, outbox, reconciliation: await broker.reconciliationSummary(grant.namespace)
      });
    } catch (error) {
      const status = error instanceof IdempotencyConflictError ? 409 : 422;
      return json(response, status, { error: error instanceof Error ? error.message : "invalid V2.4 Paper execution command" });
    }
  }
  if (request.method !== "POST" || request.url !== "/internal/v1/historical-orders/execute") return json(response, 404, { error: "not found" });
  let raw = "";
  for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw, "utf8") > 8192) return json(response, 413, { error: "historical FakeBroker command exceeds 8 KiB" }); }
  try {
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return json(response, 422, { error: "historical FakeBroker command must be an object" });
    const command = body as HistoricalExecutionCommand & { authorizationId?: string };
    const allowedKeys = ["authorizationId", "namespace", "accountId", "clientOrderId", "security", "requestedQuantity", "initialAccountCash", "bar", "side", "orderType", "timeInForce", "limitPrice", "participationRate", "slippageBps", "currency", "marketFeeSchedule", "reservation"] as const;
    if (!hasOnlyKeys(command, allowedKeys, ["authorizationId", "namespace", "accountId", "clientOrderId", "security", "requestedQuantity", "bar"])) return json(response, 422, { error: "historical FakeBroker command contains unsupported or missing fields" });
    if (!command.bar || typeof command.bar !== "object" || Array.isArray(command.bar) || !hasOnlyKeys(command.bar as unknown as Record<string, unknown>, ["timestamp", "open", "volume", "high", "low", "close", "tradingStatus", "upperLimit", "lowerLimit"], ["timestamp", "open", "volume"])) return json(response, 422, { error: "historical FakeBroker bar contains unsupported or missing fields" });
    if (command.marketFeeSchedule !== undefined && (!command.marketFeeSchedule || typeof command.marketFeeSchedule !== "object" || Array.isArray(command.marketFeeSchedule) || !hasOnlyKeys(command.marketFeeSchedule as unknown as Record<string, unknown>, ["scheduleId", "commissionRatePartsPerBillion", "minimumCommissionCents"], ["scheduleId", "commissionRatePartsPerBillion", "minimumCommissionCents"]))) return json(response, 422, { error: "historical FakeBroker fee schedule contains unsupported or missing fields" });
    if (command.reservation !== undefined && (!command.reservation || typeof command.reservation !== "object" || Array.isArray(command.reservation) || !hasOnlyKeys(command.reservation as unknown as Record<string, unknown>, ["reservationId", "ownerId", "testRunId", "clientOrderId"], ["reservationId", "ownerId", "testRunId", "clientOrderId"]))) return json(response, 422, { error: "historical FakeBroker reservation contains unsupported or missing fields" });
    if (!command.authorizationId) return json(response, 403, { error:"valid governance authorization is required" });
    const authorization = await replayGovernanceClient.validateHistoricalReplayExecution({ authorizationId:command.authorizationId, accountId:command.accountId, command:{namespace:command.namespace,accountId:command.accountId,clientOrderId:command.clientOrderId,security:command.security,requestedQuantity:command.requestedQuantity,...(command.initialAccountCash !== undefined ? {initialAccountCash:command.initialAccountCash} : {}),bar:command.bar} });
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
        const delivered = await fillOutboxDelivery.deliver(outbox.event_id);
        if (!delivered) throw new Error("portfolio fill posting failed; outbox retry scheduled");
      }
    } else if ((execution.result.status === "REJECTED" || execution.result.status === "EXPIRED") && command.reservation) {
      const resolution = await broker.reservationResolutionForOrder(execution.result.orderId);
      if (resolution && resolution.status !== "DELIVERED" && !await fillOutboxDelivery.deliverReservationResolution(resolution.event_id)) {
        throw new Error("portfolio reservation release failed; outbox retry scheduled");
      }
    }
    return json(response, 200, execution);
  } catch (error) { return json(response, error instanceof IdempotencyConflictError ? error.statusCode : 422, { error: error instanceof Error ? error.message : "invalid command" }); }
}).listen(port, process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
