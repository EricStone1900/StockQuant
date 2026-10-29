import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/trade-execution-historical.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-platform-paper-execution-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const execute = document.paths?.["/internal/v1/v24/paper-orders/execute-snapshot"]?.post;
const c5Execute = document.paths?.["/internal/v1/c5-local/paper-orders/execute"]?.post;
const c5Settlement = document.paths?.["/internal/v1/c5-local/accounts/settlements"]?.post;
const lookup = document.paths?.["/internal/v1/orders/by-client-id"]?.get;
const reconciliation = document.paths?.["/internal/v1/reconciliation/summary"]?.get;
const externalOrder = document.paths?.["/internal/v1/fake-broker/external-orders"]?.post;
const platformCaller = (operation) => operation?.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const === "platform-api-service";
if (execute?.operationId !== "executeV24FixtureSnapshotOrder" || c5Execute?.operationId !== "executeC5LocalPaperOrder" || c5Settlement?.operationId !== "settleC5LocalPaperSession" || lookup?.operationId !== "readV24FakeOrderByClientIdentity" || reconciliation?.operationId !== "readV24PaperReconciliationSummary" || externalOrder?.operationId !== "recordSimulatedFakeBrokerExternalOrder" || !platformCaller(execute) || !platformCaller(c5Execute) || !platformCaller(c5Settlement) || !platformCaller(lookup) || !platformCaller(reconciliation) || !platformCaller(externalOrder) || !execute.security?.some((rule) => rule.ServiceBearer) || !c5Execute.security?.some((rule) => rule.ServiceBearer) || !c5Settlement.security?.some((rule) => rule.ServiceBearer) || !lookup.security?.some((rule) => rule.ServiceBearer) || !reconciliation.security?.some((rule) => rule.ServiceBearer) || !externalOrder.security?.some((rule) => rule.ServiceBearer) || !JSON.stringify(execute.requestBody).includes("v24-paper-execution-command.schema.json") || !JSON.stringify(c5Execute.requestBody).includes("c5-local-paper-execution-command-v1.schema.json") || !JSON.stringify(c5Settlement.requestBody).includes("c5-local-session-settlement-command-v1.schema.json") || !JSON.stringify(externalOrder.requestBody).includes("fake-broker-external-order.schema.json")) throw new Error("Expected bearer-protected Platform V2.4/C5 execution and settlement, original-order recovery, reconciliation and isolated FakeBroker external-order operations");

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/trade-execution-historical.v1.json
import type * as Contracts from "./generated-types.js";

export class GeneratedPlatformPaperExecutionClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Trade Execution base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async executeV24FixtureSnapshotOrder(command: Contracts.V24PaperExecutionCommand, timeoutMs: number = 30000): Promise<Response> {
    return this.request(this.baseUrl + "/internal/v1/v24/paper-orders/execute-snapshot", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(command), signal: AbortSignal.timeout(timeoutMs) });
  }

  async executeC5LocalPaperOrder(authorization: Contracts.C5LocalFakeBrokerExecutionCommand["authorization"], timeoutMs: number = 20000): Promise<Response> {
    return this.request(this.baseUrl + "/internal/v1/c5-local/paper-orders/execute", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify({ authorization }), signal: AbortSignal.timeout(timeoutMs) });
  }

  async settleC5LocalPaperSession(command: Contracts.C5LocalSessionSettlementCommand): Promise<Response> {
    return this.request(this.baseUrl + "/internal/v1/c5-local/accounts/settlements", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(command), signal: AbortSignal.timeout(15000) });
  }

  async readV24FakeOrderByClientIdentity(namespace: string, clientOrderId: string, timeoutMs: number = 5000): Promise<Response> {
    if (!namespace || !clientOrderId) throw new Error("namespace and clientOrderId are required");
    const query = new URLSearchParams({ namespace, clientOrderId });
    return this.request(this.baseUrl + "/internal/v1/orders/by-client-id?" + query, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
  }

  async readV24PaperReconciliationSummary(namespace: string, timeoutMs: number = 5000): Promise<Response> {
    if (!namespace) throw new Error("namespace is required");
    return this.request(this.baseUrl + "/internal/v1/reconciliation/summary?namespace=" + encodeURIComponent(namespace), { headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
  }

  async recordSimulatedFakeBrokerExternalOrder(order: Contracts.FakeBrokerSimulatedExternalOrder, timeoutMs: number = 5000): Promise<Response> {
    return this.request(this.baseUrl + "/internal/v1/fake-broker/external-orders", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(order), signal: AbortSignal.timeout(timeoutMs) });
  }
}
`;
const checkOnly = process.argv.includes("--check");
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error("generated-platform-paper-execution-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Platform Paper execution OpenAPI client ${checkOnly ? "checked" : "generated"}: 4 operations -> services/platform-api-service/src/contracts/generated-platform-paper-execution-client.ts`);
