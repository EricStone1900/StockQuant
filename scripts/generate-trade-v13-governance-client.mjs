import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/decision-governance-v13-proposals.v1.json");
const output = resolve(root, "services/trade-execution-service/src/contracts/generated-v13-governance-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
for (const [path, method, operationId, requestSchema] of [
  ["/internal/v1/proposals/{proposalId}", "get", "readV13PaperProposal", null],
  ["/internal/v1/proposals/{proposalId}/execution-authorizations", "post", "authorizeV13ApprovedProposalExecution", "v13-execution-authorization-command.schema.json"],
  ["/internal/v1/proposals/{proposalId}/execution-authorizations/validate", "post", "validateV13ApprovedProposalExecution", "v13-execution-authorization-validation.schema.json"],
]) {
  const operation = document.paths?.[path]?.[method];
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || (requestSchema && (!operation.requestBody?.required || !JSON.stringify(operation).includes(requestSchema)))) throw new Error(`V1.3 Trade Governance contract is incomplete: ${operationId}`);
}
const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/decision-governance-v13-proposals.v1.json
import type * as Contracts from "./generated-types.js";

export type TradeV13GovernanceResponse<T> = { status: number; body?: T | Record<string, unknown> };

export class GeneratedTradeV13GovernanceClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Trade Execution service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }
  async readProposal(proposalId: string, ownerId: string, timeoutMs = 5000): Promise<TradeV13GovernanceResponse<Contracts.V13ProposalResult>> {
    return this.send("GET", "/internal/v1/proposals/" + encodeURIComponent(proposalId), undefined, { "x-stockquant-owner-id": ownerId }, timeoutMs) as Promise<TradeV13GovernanceResponse<Contracts.V13ProposalResult>>;
  }
  async authorizeExecution(proposalId: string, body: Contracts.V13ExecutionAuthorizationCommand, timeoutMs = 5000): Promise<TradeV13GovernanceResponse<Contracts.V13ExecutionAuthorizationResult>> {
    return this.send("POST", "/internal/v1/proposals/" + encodeURIComponent(proposalId) + "/execution-authorizations", body, {}, timeoutMs) as Promise<TradeV13GovernanceResponse<Contracts.V13ExecutionAuthorizationResult>>;
  }
  async validateExecution(proposalId: string, body: Contracts.V13ExecutionAuthorizationValidation, timeoutMs = 5000): Promise<TradeV13GovernanceResponse<Record<string, unknown>>> {
    return this.send("POST", "/internal/v1/proposals/" + encodeURIComponent(proposalId) + "/execution-authorizations/validate", body, {}, timeoutMs) as Promise<TradeV13GovernanceResponse<Record<string, unknown>>>;
  }
  private async send(method: "GET" | "POST", path: string, body: unknown, extra: Record<string, string>, timeoutMs: number): Promise<TradeV13GovernanceResponse<unknown>> {
    const response = await this.request(this.baseUrl + path, { method, headers: { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: "Bearer " + this.bearerToken, ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(timeoutMs) });
    return { status: response.status, body: await response.json().catch(() => undefined) as Record<string, unknown> | undefined };
  }
}
`;
let actual; try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("generated-v13-governance-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true }); await writeFile(output, expected);
}
console.log(`V1.3 Trade Governance OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}: 3 operations -> services/trade-execution-service/src/contracts/generated-v13-governance-client.ts`);
