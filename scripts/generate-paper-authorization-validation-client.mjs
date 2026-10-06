import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/decision-governance-paper-authorization.v1.json");
const output = resolve(root, "services/trade-execution-service/src/contracts/generated-paper-authorization-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operation = document.paths?.["/internal/v1/paper-authorizations/validate"]?.post;
if (operation?.operationId !== "validateV24PaperFixtureRun" || !operation.security?.some((rule) => rule.ServiceBearer) || !JSON.stringify(operation.requestBody).includes("v24-paper-authorization-validation.schema.json")) throw new Error("Expected Bearer-scoped V2.4 Paper authorization validation operation");

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/decision-governance-paper-authorization.v1.json
import type * as Contracts from "./generated-types.js";

export class GeneratedPaperAuthorizationClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Trade Execution service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async validateV24PaperFixtureRun(body: Contracts.V24PaperAuthorizationValidation, timeoutMs: number = 5000): Promise<Response> {
    return this.request(this.baseUrl + "/internal/v1/paper-authorizations/validate", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  }
}
`;
const checkOnly = process.argv.includes("--check");
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error("generated-paper-authorization-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Paper authorization OpenAPI client ${checkOnly ? "checked" : "generated"}: 1 operation -> services/trade-execution-service/src/contracts/generated-paper-authorization-client.ts`);
