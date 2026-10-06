import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/market-data-minute-import.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-market-data-minute-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operation = document.paths?.["/v2/minute/csv/import"]?.post;
const uploadOperations = [
  document.paths?.["/v2/minute/{format}/uploads"]?.post,
  document.paths?.["/v2/minute/{format}/uploads/{uploadId}/chunks/{index}"]?.put,
  document.paths?.["/v2/minute/{format}/uploads/{uploadId}"]?.get,
  document.paths?.["/v2/minute/{format}/uploads/{uploadId}/{action}"]?.post,
];
const readOperations = [document.paths?.["/v2/minute/csv/preview"]?.post, document.paths?.["/v2/minute/imports/{version}"]?.get, document.paths?.["/v2/minute/imports/{version}/bars"]?.get];
const fixturePreviewOperation = document.paths?.["/v2/minute/preview"]?.get;
const fixtureImportOperation = document.paths?.["/v2/minute/import"]?.post;
if (document.openapi !== "3.1.0" || !document.servers?.[0]?.url?.includes("market-data-service") || operation?.operationId !== "importMarketDataMinuteCsv" || !operation.security?.some((item) => item.ServiceBearer) || operation.parameters?.find((item) => item.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !JSON.stringify(operation.requestBody).includes("minute-csv-import-request-v1.schema.json") || !JSON.stringify(operation.responses?.["201"]).includes("minute-import-record-v1.schema.json") || uploadOperations.some((item) => !item?.security?.some((entry) => entry.ServiceBearer) || item.parameters?.find((parameter) => parameter.name === "x-stockquant-owner-id")?.required !== true) || readOperations.some((item) => !item?.security?.some((entry) => entry.ServiceBearer) || item.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service") || fixturePreviewOperation?.operationId !== "previewMarketDataMinuteFixture" || !fixturePreviewOperation.security?.some((entry) => entry.ServiceBearer) || !JSON.stringify(fixturePreviewOperation.responses?.["200"]).includes("minute-fixture-preview-v1.schema.json") || fixtureImportOperation?.operationId !== "importMarketDataMinuteFixture" || !fixtureImportOperation.security?.some((entry) => entry.ServiceBearer) || !JSON.stringify(fixtureImportOperation.requestBody).includes("minute-fixture-import-request-v1.schema.json")) throw new Error("Market Data minute import/upload OpenAPI contract is incomplete");

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/market-data-minute-import.v1.json
import type * as Contracts from "./generated-types.js";

export class MarketDataMinuteHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Market Data minute import returned HTTP " + status); this.name = "MarketDataMinuteHttpError"; }
}

export class GeneratedMarketDataMinuteClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly headers: () => Record<string, string>, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Market Data base URL must be HTTP(S)");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async importMarketDataMinuteCsv(body: Contracts.MinuteCsvImportRequest, timeoutMs = 30000): Promise<Contracts.MinuteImportRecord> {
    const response = await this.request(this.baseUrl + "/v2/minute/csv/import", { method: "POST", headers: { ...this.headers(), "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (![200, 201].includes(response.status)) throw new MarketDataMinuteHttpError(response.status, value);
    return value as Contracts.MinuteImportRecord;
  }

  async previewMarketDataMinuteFixture(): Promise<Contracts.MinuteFixturePreview> {
    return this.call<Contracts.MinuteFixturePreview>("/v2/minute/preview", "GET");
  }

  async importMarketDataMinuteFixture(body: Contracts.MinuteFixtureImportRequest): Promise<Contracts.MinuteImportRecord> {
    const response = await this.request(this.baseUrl + "/v2/minute/import", { method: "POST", headers: { ...this.headers(), "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    const value = await response.json().catch(() => ({}));
    if (![200, 201, 422].includes(response.status)) throw new MarketDataMinuteHttpError(response.status, value);
    return value as Contracts.MinuteImportRecord;
  }

  async createMarketDataMinuteUpload(format: "csv" | "parquet", body: Contracts.MinuteCsvUploadCreateRequest, ownerId: string): Promise<Contracts.MinuteCsvUploadProgress> {
    return this.call<Contracts.MinuteCsvUploadProgress>(\`/v2/minute/\${format}/uploads\`, "POST", body, ownerId);
  }

  async putMarketDataMinuteUploadChunk(format: "csv" | "parquet", uploadId: string, index: number, body: Contracts.MinuteCsvUploadChunkRequest, ownerId: string): Promise<Contracts.MinuteCsvUploadProgress> {
    return this.call<Contracts.MinuteCsvUploadProgress>(\`/v2/minute/\${format}/uploads/\${encodeURIComponent(uploadId)}/chunks/\${index}\`, "PUT", body, ownerId);
  }

  async getMarketDataMinuteUpload(format: "csv" | "parquet", uploadId: string, ownerId: string): Promise<Contracts.MinuteCsvUploadProgress> {
    return this.call<Contracts.MinuteCsvUploadProgress>(\`/v2/minute/\${format}/uploads/\${encodeURIComponent(uploadId)}\`, "GET", undefined, ownerId);
  }

  async actOnMarketDataMinuteUpload(format: "csv" | "parquet", uploadId: string, action: "preview" | "finalize" | "cancel", ownerId: string): Promise<unknown> {
    return this.call<unknown>(\`/v2/minute/\${format}/uploads/\${encodeURIComponent(uploadId)}/\${action}\`, "POST", {}, ownerId);
  }

  async previewMarketDataMinuteCsv(body: Contracts.MinuteCsvImportRequest): Promise<unknown> {
    return this.call<unknown>("/v2/minute/csv/preview", "POST", body);
  }

  async getMarketDataMinuteImport(version: string): Promise<Contracts.MinuteImportRecord> {
    return this.call<Contracts.MinuteImportRecord>(\`/v2/minute/imports/\${encodeURIComponent(version)}\`, "GET");
  }

  async pageMarketDataMinuteImportBars(version: string, query: { cursor?: string; pageSize?: string; securityId?: string }): Promise<unknown> {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined)));
    return this.call<unknown>(\`/v2/minute/imports/\${encodeURIComponent(version)}/bars?\${params.toString()}\`, "GET");
  }

  private async call<T>(path: string, method: "GET" | "POST" | "PUT", body?: unknown, ownerId?: string): Promise<T> {
    const response = await this.request(this.baseUrl + path, { method, headers: { ...this.headers(), ...(ownerId === undefined ? {} : { "x-stockquant-owner-id": ownerId }), ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new MarketDataMinuteHttpError(response.status, value);
    return value as T;
  }
}
`;

const checkOnly = process.argv.includes("--check");
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error("generated-market-data-minute-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Market Data minute OpenAPI client ${checkOnly ? "checked" : "generated"}: 10 operations -> services/platform-api-service/src/contracts/generated-market-data-minute-client.ts`);
