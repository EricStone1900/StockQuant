import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/replay-governance-quant.v1.json");
const document = JSON.parse(await readFile(source, "utf8"));
for (const [path, method, operationId, schema] of [
  ["/internal/v1/authorizations", "post", "authorizeHistoricalReplayExecution", "replay-execution-authorization-command.schema.json"],
  ["/v1/research/multi-bar", "post", "summarizeHistoricalReplayBars", "multi-bar-research-command.schema.json"]
]) {
  const operation = document.paths?.[path]?.[method];
  if (operation?.operationId !== operationId || !operation.security?.some((rule) => rule.ServiceBearer) || operation.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const !== "historical-replay-worker" || !JSON.stringify(operation.requestBody).includes(schema) || !operation.responses?.["200"]) throw new Error(`Replay dependency operation is incomplete: ${operationId}`);
}

const output = resolve(root, "services/historical-replay-worker/src/contracts/generated-replay-dependencies-client.ts");
const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/replay-governance-quant.v1.json
import type * as Contracts from "./generated-types.js";

export class ReplayDependencyHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Replay dependency returned HTTP " + status); this.name = "ReplayDependencyHttpError"; }
}

export class GeneratedReplayDependenciesClient {
  private readonly governanceUrl: string;
  private readonly quantResearchUrl: string;
  constructor(governanceUrl: string, quantResearchUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(governanceUrl) || !/^https?:\\/\\//u.test(quantResearchUrl)) throw new Error("Replay dependency base URLs must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Historical Replay service bearer token is not configured");
    this.governanceUrl = governanceUrl.replace(/\\/+$/u, "");
    this.quantResearchUrl = quantResearchUrl.replace(/\\/+$/u, "");
  }
  async authorizeHistoricalReplayExecution(body: Contracts.ReplayExecutionAuthorizationCommand, timeoutMs = 5000): Promise<Contracts.ReplayExecutionAuthorizationResult> {
    return this.call(this.governanceUrl + "/internal/v1/authorizations", body, timeoutMs);
  }
  async summarizeHistoricalReplayBars(body: Contracts.MultiBarResearchCommand, timeoutMs = 120000): Promise<Contracts.MultiBarResearchResult> {
    return this.call(this.quantResearchUrl + "/v1/research/multi-bar", body, timeoutMs);
  }
  private async call<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
    const response = await this.request(url, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new ReplayDependencyHttpError(response.status, value);
    return value as T;
  }
}
`;
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("generated-replay-dependencies-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Replay Governance/Quant Research OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}: 2 operations`);
