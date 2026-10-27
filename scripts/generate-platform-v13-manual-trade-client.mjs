import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/trade-execution-v13-manual-paper.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-v13-manual-trade-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operation = document.paths?.["/internal/v1/v13/paper-orders/execute-manual-proposal"]?.post;
const autoOperation = document.paths?.["/internal/v1/v13/paper-orders/execute-auto-proposal"]?.post;
const readOperation = document.paths?.["/internal/v1/orders/by-client-id"]?.get;
const assetOperation = document.paths?.["/internal/v1/v13/accounts/assets"]?.get;
const inFlightOperation = document.paths?.["/internal/v1/accounts/{accountId}/in-flight-orders"]?.get;
const settlementOperation = document.paths?.["/internal/v1/v13/accounts/settlements"]?.post;
const feeCorrectionOperation = document.paths?.["/internal/v1/orders/{orderId}/fills/{externalFillId}/fee-corrections"]?.post;
if (operation?.operationId !== "executeV13ApprovedManualProposal" || !operation.security?.some((item) => item.ServiceBearer) || !operation.requestBody?.required || autoOperation?.operationId !== "executeV13AutoPolicyProposal" || !autoOperation.security?.some((item) => item.ServiceBearer) || !autoOperation.requestBody?.required || !JSON.stringify(autoOperation.requestBody).includes("v13-auto-paper-execution-command.schema.json") || readOperation?.operationId !== "readV13FakeBrokerOrderByClientId" || !readOperation.security?.some((item) => item.ServiceBearer) || assetOperation?.operationId !== "readV13IndependentFakeBrokerAssets" || !assetOperation.security?.some((item) => item.ServiceBearer) || inFlightOperation?.operationId !== "readV21InFlightOrdersForAccount" || !inFlightOperation.security?.some((item) => item.ServiceBearer) || settlementOperation?.operationId !== "settleV13PaperReceivables" || !settlementOperation.security?.some((item) => item.ServiceBearer) || !settlementOperation.requestBody?.required || feeCorrectionOperation?.operationId !== "correctV13FakeBrokerFillFee" || !feeCorrectionOperation.security?.some((item) => item.ServiceBearer) || !JSON.stringify(feeCorrectionOperation.requestBody).includes("fill-fee-correction-command.schema.json")) throw new Error("V1.3 manual/AUTO Trade contract is incomplete");
const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/trade-execution-v13-manual-paper.v1.json
import type * as Contracts from "./generated-types.js";

export class GeneratedPlatformV13ManualTradeClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Trade Execution base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }
  async executeApprovedManualProposal(body: Contracts.V13ManualPaperExecutionCommand): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/v13/paper-orders/execute-manual-proposal", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async executeSequencedManualProposal(body: Contracts.V13ManualPaperExecutionCommand): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/v13/paper-orders/execute-manual-sequenced-proposal", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async recordSequencedFillReport(orderId: string, body: { externalFillId: string; sequence: number; cumulativeQuantity: number; price: string; fee: string; effectiveAt: string; evidenceRef: string }): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/orders/" + encodeURIComponent(orderId) + "/simulated-fill-reports", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async requestFakeBrokerCancel(orderId: string): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/orders/" + encodeURIComponent(orderId) + "/cancel", { method: "POST", headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async resolveFakeBrokerCancel(orderId: string, body: { outcome: "ACCEPTED" | "REJECTED"; reason: string; sequence: number }): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/orders/" + encodeURIComponent(orderId) + "/cancel-result", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async executeAutoPolicyProposal(body: Contracts.V13AutoPaperExecutionCommand): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/v13/paper-orders/execute-auto-proposal", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async readOrderByClientId(namespace: string, clientOrderId: string): Promise<{ status: number; body?: unknown }> {
    const query = new URLSearchParams({ namespace, clientOrderId });
    const response = await this.request(this.baseUrl + "/internal/v1/orders/by-client-id?" + query, { method: "GET", headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(5000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async readIndependentAssets(namespace: string, accountId: string): Promise<{ status: number; body?: unknown }> {
    const query = new URLSearchParams({ namespace, accountId });
    const response = await this.request(this.baseUrl + "/internal/v1/v13/accounts/assets?" + query, { method: "GET", headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(5000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async readInFlightOrders(accountId: string, scope: { namespace: string; ownerId: string; testRunId: string }): Promise<{ status: number; body?: unknown }> {
    const query = new URLSearchParams(scope);
    const response = await this.request(this.baseUrl + "/internal/v1/accounts/" + encodeURIComponent(accountId) + "/in-flight-orders?" + query, { method: "GET", headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(5000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async settleForSession(body: { namespace: string; accountId: string; ownerId: string; testRunId: string; asOf: string }): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/v13/accounts/settlements", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async correctFillFee(orderId: string, externalFillId: string, body: Contracts.FillFeeCorrectionCommand): Promise<{ status: number; body?: unknown }> {
    const path = "/internal/v1/orders/" + encodeURIComponent(orderId) + "/fills/" + encodeURIComponent(externalFillId) + "/fee-corrections";
    const response = await this.request(this.baseUrl + path, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
}
`;
let actual; try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("generated-v13-manual-trade-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true }); await writeFile(output, expected);
}
console.log(`V1.3 manual Trade OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}`);
