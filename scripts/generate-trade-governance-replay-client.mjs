import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/replay-governance-quant.v1.json");
const operation = JSON.parse(await readFile(source, "utf8")).paths?.["/internal/v1/authorizations/validate"]?.post;
if (operation?.operationId !== "validateHistoricalReplayExecution" || !operation.security?.some((rule) => rule.ServiceBearer) || operation.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const !== "trade-execution-service" || !JSON.stringify(operation.requestBody).includes("replay-execution-authorization-validation.schema.json")) throw new Error("Replay authorization validation OpenAPI operation is incomplete");

const output = resolve(root, "services/trade-execution-service/src/contracts/generated-replay-governance-client.ts");
const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/replay-governance-quant.v1.json
import type * as Contracts from "./generated-types.js";

export class GeneratedReplayGovernanceClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Trade Execution service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }
  validateHistoricalReplayExecution(body: Contracts.ReplayExecutionAuthorizationValidation, timeoutMs = 5000): Promise<Response> {
    return this.request(this.baseUrl + "/internal/v1/authorizations/validate", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  }
}
`;
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("generated-replay-governance-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Trade Execution replay Governance OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}: 1 operation`);
