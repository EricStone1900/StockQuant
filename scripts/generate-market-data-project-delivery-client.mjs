import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/market-data-project-delivery.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-market-data-project-delivery-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operations = [
  ["/v2/data/page", "pageProjectData", "project-data-page-request.schema.json", "project-data-page.schema.json"],
  ["/v2/data/export", "exportProjectData", "project-data-export-request.schema.json", "project-data-export.schema.json"],
];
for (const [path, operationId, requestSchema, responseSchema] of operations) {
  const operation = document.paths?.[path]?.post;
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ProjectToken)
    || !operation.parameters?.some((parameter) => parameter.name === "x-stockquant-project-id" && parameter.required)
    || !operation.requestBody?.required || !JSON.stringify(operation).includes(requestSchema)
    || !JSON.stringify(operation.responses?.["200"]).includes(responseSchema)) {
    throw new Error(`Expected project-token protected ${operationId} OpenAPI operation`);
  }
}

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/market-data-project-delivery.v1.json
import type * as Contracts from "./generated-types.js";

export class MarketDataProjectDeliveryHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown, operation: string) {
    super("Market Data " + operation + " returned HTTP " + status);
    this.name = "MarketDataProjectDeliveryHttpError";
  }
}

export class GeneratedMarketDataProjectDeliveryClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly projectId: string, private readonly projectToken: string | undefined, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Market Data base URL must be HTTP(S)");
    if (!projectId.trim()) throw new Error("Market Data project ID must not be empty");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  pageProjectData(body: Contracts.ProjectDataPageRequest): Promise<Contracts.ProjectDataPage> {
    return this.call("/v2/data/page", body, "DATA_READ");
  }

  exportProjectData(body: Contracts.ProjectDataExportRequest): Promise<Contracts.ProjectDataExport> {
    return this.call("/v2/data/export", body, "DATA_EXPORT");
  }

  private async call<T>(path: string, body: Record<string, unknown>, scope: "DATA_READ" | "DATA_EXPORT"): Promise<T> {
    const headers: Record<string, string> = { "content-type": "application/json", "x-stockquant-project-id": this.projectId };
    if (this.projectToken) headers["x-stockquant-project-token"] = this.projectToken;
    const response = await this.request(this.baseUrl + path, {
      method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
    });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new MarketDataProjectDeliveryHttpError(response.status, value, scope);
    return value as T;
  }
}
`;
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("generated-market-data-project-delivery-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Market Data project-delivery OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}: ${operations.length} operations`);
