import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/trade-execution-v24-readiness.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-platform-paper-readiness-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operation = document.paths?.["/internal/v1/v24/paper-readiness"]?.get;
const caller = operation?.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const;
if (operation?.operationId !== "getV24PaperExecutionReadiness" || caller !== "platform-api-service" || !operation.security?.some((rule) => rule.ServiceBearer) || operation.parameters?.find((parameter) => parameter.name === "market")?.required !== true || !JSON.stringify(operation.responses?.["200"]).includes("v24-paper-readiness.schema.json")) throw new Error("Expected Platform-scoped read-only V2.4 Paper readiness operation");

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/trade-execution-v24-readiness.v1.json
import type * as Contracts from "./generated-types.js";

export type PlatformPaperReadinessResult = { status: number; body?: Contracts.V24PaperReadiness | Record<string, unknown> };

export class GeneratedPlatformPaperReadinessClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Trade Execution base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async getV24PaperExecutionReadiness(market: "CN_A" | "US_EQUITY", timeoutMs: number = 5000): Promise<PlatformPaperReadinessResult> {
    if (market !== "CN_A" && market !== "US_EQUITY") throw new Error("market must be CN_A or US_EQUITY");
    const response = await this.request(this.baseUrl + "/internal/v1/v24/paper-readiness?market=" + encodeURIComponent(market), { headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as Contracts.V24PaperReadiness | Record<string, unknown> | undefined;
    return { status: response.status, body: value };
  }
}
`;
const checkOnly = process.argv.includes("--check");
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error("generated-platform-paper-readiness-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Platform Paper readiness OpenAPI client ${checkOnly ? "checked" : "generated"}: 1 operation -> services/platform-api-service/src/contracts/generated-platform-paper-readiness-client.ts`);
