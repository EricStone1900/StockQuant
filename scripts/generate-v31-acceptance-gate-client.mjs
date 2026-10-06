import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/v31-acceptance-gate.v1.json");
const output = resolve(root, "services/research-automation-service/src/contracts/generated-v31-acceptance-gate-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operation = document.paths?.["/internal/v1/acceptance/v3/v3.1/gate/{testRunId}"]?.get;
const identity = operation?.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const;
if (operation?.operationId !== "readV31PromotionGate" || identity !== "research-automation-service" || !operation.security?.some((rule) => rule.ServiceBearer)) throw new Error("Expected the Research Automation scoped V3.1 promotion gate operation");
if (!JSON.stringify(operation.responses?.["200"]).includes("v3.1-promotion-gate.schema.json") || !operation.parameters?.some((parameter) => parameter.name === "testRunId" && parameter.in === "path" && parameter.required)) throw new Error("V3.1 promotion gate requires a typed exact-run response and ID");
const sourceUrl = "packages/contracts/openapi/v31-acceptance-gate.v1.json";
const expected = `// GENERATED FILE. DO NOT EDIT. Source: ${sourceUrl}
import type * as Contracts from "./generated-types.js";

export type V31PromotionGateReadResult = { status: number; body?: Contracts.V31ExactRunPromotionGate };

export class GeneratedV31AcceptanceGateClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    const parsed = new URL(baseUrl);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("Platform API base URL must be an HTTP(S) origin/path without credentials, query, or fragment");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Research Automation service Bearer token is invalid");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async readV31PromotionGate(testRunId: string, timeoutMs: number = 3000): Promise<V31PromotionGateReadResult> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new Error("V3.1 gate testRunId must be a UUID");
    const url = new URL("/internal/v1/acceptance/v3/v3.1/gate/" + encodeURIComponent(testRunId), this.baseUrl);
    const response = await this.request(url, { method: "GET", redirect: "error", headers: { "x-stockquant-service-id": "research-automation-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.json().catch(() => undefined) as Contracts.V31ExactRunPromotionGate | undefined;
    return { status: response.status, body };
  }
}
`;
const checkOnly = process.argv.includes("--check");
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error("generated-v31-acceptance-gate-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`V3.1 acceptance gate OpenAPI client ${checkOnly ? "checked" : "generated"}: 1 operation -> services/research-automation-service/src/contracts/generated-v31-acceptance-gate-client.ts`);
