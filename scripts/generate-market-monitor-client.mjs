import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/market-monitor.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-market-monitor-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
for (const [path, method, operationId] of [["/v1/quote-quality/evaluations", "post", "evaluateQuoteQuality"], ["/v1/quote-quality/latest", "get", "getLatestQuoteQuality"]]) {
  const operation = document.paths?.[path]?.[method];
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer)) throw new Error(`Expected bearer-protected Market Monitor operation ${operationId}`);
}
const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/market-monitor.v1.json
import type * as Contracts from "./generated-types.js";

export class MarketMonitorClientError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Market Monitor returned HTTP " + status); this.name = "MarketMonitorClientError"; }
}

export class GeneratedMarketMonitorClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Market Monitor base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }
  private async call<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
    const response = await this.request(this.baseUrl + path, { method, headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(8000) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new MarketMonitorClientError(response.status, value);
    return value as T;
  }
  evaluateQuoteQuality(body: Contracts.MarketMonitorQuoteQualityEvaluationRequest): Promise<Contracts.MarketMonitorQuoteQualityResult> { return this.call("/v1/quote-quality/evaluations", "POST", body); }
  getLatestQuoteQuality(scope: Contracts.MarketMonitorQuoteQualityScope): Promise<Contracts.MarketMonitorLatestQuoteQuality> { return this.call("/v1/quote-quality/latest?" + new URLSearchParams(scope), "GET"); }
}
`;
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
const checkOnly = process.argv.includes("--check");
if (actual !== expected) {
  if (checkOnly) throw new Error("generated-market-monitor-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Market Monitor OpenAPI client ${checkOnly ? "checked" : "generated"}: 2 operations -> services/platform-api-service/src/contracts/generated-market-monitor-client.ts`);
