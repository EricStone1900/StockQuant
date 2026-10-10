import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const document = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/decision-governance-v13-auto-mandates.v1.json"), "utf8"));
const readMandate = document.paths?.["/internal/v1/auto-mandates/{mandateId}/runs/{testRunId}"]?.get;
if (readMandate?.operationId !== "readV13AutoPolicyMandate" || !readMandate.security?.some((item) => item.ServiceBearer) || !readMandate.parameters?.some((item) => item.name === "x-stockquant-service-id" && item.schema?.const === "platform-api-service")) throw new Error("V1.3 AUTO Mandate read OpenAPI contract is incomplete");
const readBudget = document.paths?.["/internal/v1/auto-mandates/{mandateId}/runs/{testRunId}/versions/{mandateVersion}/budget"]?.get;
if (readBudget?.operationId !== "readV13AutoPolicyMandateBudget" || !readBudget.security?.some((item) => item.ServiceBearer) || !readBudget.parameters?.some((item) => item.name === "x-stockquant-service-id" && item.schema?.const === "platform-api-service")) throw new Error("V1.3 AUTO Mandate budget read OpenAPI contract is incomplete");
const operations = [
  ["/internal/v1/auto-mandates", "createV13AutoPolicyMandate", "v13-auto-mandate-command.schema.json", "platform-api-service"],
  ["/internal/v1/auto-mandates/{mandateId}/activate", "activateV13AutoPolicyMandate", "v13-auto-mandate-transition-command.schema.json", "platform-api-service"],
  ["/internal/v1/auto-mandates/{mandateId}/pause", "pauseV13AutoPolicyMandate", "v13-auto-mandate-transition-command.schema.json", "platform-api-service"],
  ["/internal/v1/auto-mandates/{mandateId}/orders/authorize", "authorizeV13AutoPolicyOrder", "v13-auto-mandate-order-command.schema.json", "trade-execution-service"],
  ["/internal/v1/auto-mandates/reservations/{reservationId}/settle", "settleV13AutoPolicyBudgetReservation", "v13-auto-mandate-settlement-command.schema.json", "trade-execution-service"],
];
for (const [path, operationId, schema, serviceId] of operations) {
  const operation = document.paths?.[path]?.post;
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || !operation.requestBody?.required || !JSON.stringify(operation.requestBody).includes(schema) || !operation.parameters?.some((item) => item.name === "x-stockquant-service-id" && item.schema?.const === serviceId)) throw new Error(`V1.3 AUTO Mandate OpenAPI contract is incomplete: ${operationId}`);
}

const platformOutput = resolve(root, "services/platform-api-service/src/contracts/generated-v13-auto-mandate-client.ts");
const platformExpected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/decision-governance-v13-auto-mandates.v1.json
import type * as Contracts from "./generated-types.js";

export type V13AutoMandateResponse<T = unknown> = { status: number; body?: T | Record<string, unknown> };

export class GeneratedPlatformV13AutoMandateClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }
  async create(body: Contracts.V13AutoMandateCommand, ownerId: string, actorId: string, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    return this.send("/internal/v1/auto-mandates", body, { "x-stockquant-owner-id": ownerId, "x-stockquant-actor-id": actorId }, timeoutMs);
  }
  async read(mandateId: string, testRunId: string, ownerId: string, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    const path = "/internal/v1/auto-mandates/" + encodeURIComponent(mandateId) + "/runs/" + encodeURIComponent(testRunId);
    const response = await this.request(this.baseUrl + path, { method: "GET", headers: { "x-stockquant-service-id": "platform-api-service", "x-stockquant-owner-id": ownerId, authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string,unknown> | undefined };
  }
  async readBudget(mandateId: string, testRunId: string, mandateVersion: number, ownerId: string, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    if (!Number.isSafeInteger(mandateVersion) || mandateVersion < 1) throw new Error("Mandate version must be a positive integer");
    const path = "/internal/v1/auto-mandates/" + encodeURIComponent(mandateId) + "/runs/" + encodeURIComponent(testRunId) + "/versions/" + mandateVersion + "/budget";
    const response = await this.request(this.baseUrl + path, { method: "GET", headers: { "x-stockquant-service-id": "platform-api-service", "x-stockquant-owner-id": ownerId, authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string,unknown> | undefined };
  }
  async activate(mandateId: string, body: Contracts.V13AutoMandateTransitionCommand, ownerId: string, actorId: string, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    return this.send("/internal/v1/auto-mandates/" + encodeURIComponent(mandateId) + "/activate", body, { "x-stockquant-owner-id": ownerId, "x-stockquant-actor-id": actorId }, timeoutMs);
  }
  async pause(mandateId: string, body: Contracts.V13AutoMandateTransitionCommand, ownerId: string, actorId: string, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    return this.send("/internal/v1/auto-mandates/" + encodeURIComponent(mandateId) + "/pause", body, { "x-stockquant-owner-id": ownerId, "x-stockquant-actor-id": actorId }, timeoutMs);
  }
  private async send(path: string, body: unknown, extraHeaders: Record<string,string>, timeoutMs: number): Promise<V13AutoMandateResponse> {
    const headers: Record<string,string> = { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken };
    const response = await this.request(this.baseUrl + path, { method: "POST", headers: { ...headers, ...extraHeaders }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string,unknown> | undefined };
  }
}
`;

const tradeOutput = resolve(root, "services/trade-execution-service/src/contracts/generated-v13-auto-mandate-client.ts");
const tradeExpected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/decision-governance-v13-auto-mandates.v1.json
import type * as Contracts from "./generated-types.js";

export type V13AutoMandateResponse<T = unknown> = { status: number; body?: T | Record<string, unknown> };

export class GeneratedTradeV13AutoMandateClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Trade service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }
  async authorizeOrder(mandateId: string, body: Contracts.V13AutoMandateOrderCommand, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    const path = "/internal/v1/auto-mandates/" + encodeURIComponent(mandateId) + "/orders/authorize";
    const headers = { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: "Bearer " + this.bearerToken };
    const response = await this.request(this.baseUrl + path, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string,unknown> | undefined };
  }
  async settleReservation(reservationId: string, body: Contracts.V13AutoMandateSettlementCommand, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    const path = "/internal/v1/auto-mandates/reservations/" + encodeURIComponent(reservationId) + "/settle";
    const headers = { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: "Bearer " + this.bearerToken };
    const response = await this.request(this.baseUrl + path, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string,unknown> | undefined };
  }
}
`;

for (const [path, expected, label] of [[platformOutput, platformExpected, "Platform"], [tradeOutput, tradeExpected, "Trade"]]) {
  let actual;
  try { actual = await readFile(path, "utf8"); } catch {}
  if (actual !== expected) {
    if (process.argv.includes("--check")) throw new Error(`${label} generated V1.3 AUTO Mandate client is stale; run pnpm contracts:generate`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, expected);
  }
}
console.log(`V1.3 AUTO Mandate OpenAPI clients ${process.argv.includes("--check") ? "checked" : "generated"}: ${operations.length} operations -> Platform and Trade`);
