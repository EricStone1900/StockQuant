import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/market-data-calendar.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-v24-market-observation-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const calendar = document.paths?.["/v2/calendar/cn-a-share/{date}"]?.get;
const quote = document.paths?.["/v2/quote/preview"]?.get;
if (calendar?.operationId !== "getCnAShareCalendarSession" || !JSON.stringify(calendar.responses?.["200"]).includes("cn-a-share-calendar-session.schema.json") || quote?.operationId !== "getV24AuthorizedQuotePreview" || !quote.security?.some((item) => item.ServiceBearer) || quote.parameters?.find((item) => item.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !JSON.stringify(quote.responses?.["200"]).includes("live-quote-preview-v1.schema.json")) throw new Error("Expected public calendar and bearer-protected V2.4 quote preview operations");

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/market-data-calendar.v1.json
import type * as Contracts from "./generated-types.js";

export class GeneratedV24MarketObservationClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Market Data base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async getCnAShareCalendarSession(date: string, timeoutMs: number = 5000): Promise<Contracts.CnAShareCalendarSession> {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/u.test(date)) throw new Error("date must use YYYY-MM-DD");
    const response = await this.request(this.baseUrl + "/v2/calendar/cn-a-share/" + encodeURIComponent(date), { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error("Market Data calendar returned HTTP " + response.status);
    return await response.json() as Contracts.CnAShareCalendarSession;
  }

  async getV24AuthorizedQuotePreview(timeoutMs: number = 8000): Promise<Contracts.LiveQuotePreview> {
    const response = await this.request(this.baseUrl + "/v2/quote/preview", { headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("Market Data quote preview returned HTTP " + response.status);
    return value as Contracts.LiveQuotePreview;
  }
}
`;
const checkOnly = process.argv.includes("--check");
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error("generated-v24-market-observation-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`V2.4 Market observation OpenAPI client ${checkOnly ? "checked" : "generated"}: 2 operations -> services/platform-api-service/src/contracts/generated-v24-market-observation-client.ts`);
