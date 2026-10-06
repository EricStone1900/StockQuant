import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/quant-promotions.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-quant-promotion-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operations = [
  ["/v1/promotions/{promotionRequestId}/detail", "get", "getPromotionRequestDetail", "v3.2-promotion-request-detail.schema.json"],
  ["/v1/promotions/{promotionRequestId}/validation-report", "get", "getIndependentValidationReport", "v3.2-independent-validation-result.schema.json"],
  ["/v1/promotions/{promotionRequestId}/decision", "post", "recordExactPromotionVersionDecision", "v3.2-promotion-decision-result.schema.json"]
];
for (const [path, method, operationId, schema] of operations) {
  const operation = document.paths?.[path]?.[method];
  const serviceSchema = operation?.parameters?.find((item) => item.name === "x-stockquant-service-id")?.schema;
  if (operation?.operationId !== operationId || !operation.security?.some((entry) => entry.ServiceBearer) || !(serviceSchema?.const === "platform-api-service" || serviceSchema?.enum?.includes("platform-api-service")) || !operation.parameters?.some((item) => item.name === "promotionRequestId" && item.in === "path" && item.required) || !JSON.stringify(operation.responses?.["200"] ?? operation.responses?.["201"]).includes(schema)) throw new Error(`Quant promotion read client contract is incomplete: ${operationId}`);
}

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/quant-promotions.v1.json
import type * as Contracts from "./generated-types.js";

export class QuantPromotionHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Quant Promotion service returned HTTP " + status); this.name = "QuantPromotionHttpError"; }
}

export class GeneratedQuantPromotionClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly headers: () => Record<string, string>, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Quant Research base URL must be HTTP(S)");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }
  private async call<T>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
    const response = await this.request(this.baseUrl + path, { method, headers: body === undefined ? this.headers() : { ...this.headers(), "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new QuantPromotionHttpError(response.status, value);
    return value as T;
  }
  getPromotionRequestDetail(id: string): Promise<Contracts.V32PromotionRequestDetail> { return this.call("/v1/promotions/" + encodeURIComponent(id) + "/detail"); }
  getIndependentValidationReport(id: string): Promise<Contracts.V32IndependentValidationResult> { return this.call("/v1/promotions/" + encodeURIComponent(id) + "/validation-report"); }
  recordExactPromotionVersionDecision(id: string, body: Contracts.V32PromotionDecisionCommand): Promise<Contracts.V32PromotionDecisionResult> { return this.call("/v1/promotions/" + encodeURIComponent(id) + "/decision", "POST", body); }
}
`;
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("generated-quant-promotion-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Quant Promotion OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}: ${operations.length} operations`);
