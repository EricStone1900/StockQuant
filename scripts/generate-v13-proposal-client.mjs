import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/decision-governance-v13-proposals.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-v13-proposal-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const read = document.paths?.["/internal/v1/proposals/{proposalId}"]?.get;
if (read?.operationId !== "readV13PaperProposal" || !read.security?.some((item) => item.ServiceBearer) || !read.parameters?.some((item) => item.name === "x-stockquant-owner-id" && item.required)) throw new Error("Owner-scoped V1.3 Governance read contract is incomplete");
for (const [path, method, operationId, requestSchema] of [
  ["/internal/v1/proposals", "post", "createV13PaperProposal", "v13-proposal-command.schema.json"],
  ["/internal/v1/proposals/{proposalId}/approve", "post", "approveV13PaperProposal", "v13-proposal-decision-command.schema.json"],
  ["/internal/v1/proposals/{proposalId}/reject", "post", "rejectV13PaperProposal", "v13-proposal-decision-command.schema.json"],
  ["/internal/v1/proposals/{proposalId}/revise", "post", "reviseV13PaperProposal", "v13-proposal-revision-command.schema.json"],
]) {
  const operation = document.paths?.[path]?.[method];
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || !operation.requestBody?.required || !JSON.stringify(operation.requestBody).includes(requestSchema)) throw new Error(`V1.3 Governance contract is incomplete: ${operationId}`);
}

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/decision-governance-v13-proposals.v1.json
import type * as Contracts from "./generated-types.js";

export type V13GovernanceResponse<T> = { status: number; body?: T | Record<string, unknown> };

export class GeneratedV13ProposalClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async createProposal(body: Contracts.V13ProposalCommand, timeoutMs = 5000): Promise<V13GovernanceResponse<Contracts.V13ProposalResult>> {
    return this.send("POST", "/internal/v1/proposals", body, {}, timeoutMs) as Promise<V13GovernanceResponse<Contracts.V13ProposalResult>>;
  }

  async decideProposal(proposalId: string, action: "approve" | "reject", actorId: string, body: Contracts.V13ProposalDecisionCommand, timeoutMs = 5000): Promise<V13GovernanceResponse<Contracts.V13ProposalDecisionResult>> {
    return this.send("POST", "/internal/v1/proposals/" + encodeURIComponent(proposalId) + "/" + action, body, { "x-stockquant-actor-id": actorId }, timeoutMs) as Promise<V13GovernanceResponse<Contracts.V13ProposalDecisionResult>>;
  }

  async reviseProposal(proposalId: string, ownerId: string, actorId: string, body: Contracts.V13ProposalRevisionCommand, timeoutMs = 5000): Promise<V13GovernanceResponse<unknown>> {
    return this.send("POST", "/internal/v1/proposals/" + encodeURIComponent(proposalId) + "/revise", body, { "x-stockquant-owner-id": ownerId, "x-stockquant-actor-id": actorId }, timeoutMs) as Promise<V13GovernanceResponse<unknown>>;
  }

  async readProposal(proposalId: string, ownerId: string, timeoutMs = 5000): Promise<V13GovernanceResponse<Contracts.V13ProposalResult>> {
    return this.send("GET", "/internal/v1/proposals/" + encodeURIComponent(proposalId), undefined, { "x-stockquant-owner-id": ownerId }, timeoutMs) as Promise<V13GovernanceResponse<Contracts.V13ProposalResult>>;
  }

  private async send(method: "GET" | "POST", path: string, body: unknown, extraHeaders: Record<string, string>, timeoutMs: number): Promise<V13GovernanceResponse<unknown>> {
    const headers: Record<string, string> = { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken };
    const response = await this.request(this.baseUrl + path, { method, headers: { ...headers, ...extraHeaders }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string, unknown> | undefined };
  }
}
`;
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("generated-v13-proposal-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`V1.3 Proposal OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}: 5 operations -> services/platform-api-service/src/contracts/generated-v13-proposal-client.ts`);
