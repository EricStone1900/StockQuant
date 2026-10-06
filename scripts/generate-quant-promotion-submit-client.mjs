import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/quant-promotions.v1.json");
const output = resolve(root, "services/research-automation-service/src/contracts/generated-quant-promotion-submit-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operation = document.paths?.["/v1/promotions"]?.post;
const serviceId = operation?.parameters?.find((item) => item.name === "x-stockquant-service-id")?.schema?.const;
if (operation?.operationId !== "submitPromotionRequest" || serviceId !== "research-automation-service" || !operation.security?.some((rule) => rule.ServiceBearer)
  || !operation.requestBody?.required || !JSON.stringify(operation.requestBody).includes("v3.2-promotion-request.schema.json")
  || !operation.responses?.["201"] || !operation.responses?.["200"] || !JSON.stringify(operation.responses["201"]).includes("v3.2-promotion-request-result.schema.json")) {
  throw new Error("Quant promotion submit contract is incomplete");
}

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/quant-promotions.v1.json
import type * as Contracts from "./generated-types.js";

export class QuantPromotionSubmitHttpError extends Error {
  constructor(readonly status: number) { super("Quant Promotion service returned HTTP " + status); this.name = "QuantPromotionSubmitHttpError"; }
}

export class GeneratedQuantPromotionSubmitClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    const parsed = new URL(baseUrl);
    if (!/^https?:$/u.test(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("Quant Research base URL must be an HTTP(S) URL without credentials, query, or fragment");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Quant service Bearer token is invalid");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async submitPromotionRequest(body: Contracts.V32PromotionRequest, timeoutMs: number = 5000): Promise<Contracts.V32PromotionRequestResult> {
    const response = await this.request(this.baseUrl + "/v1/promotions", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(timeoutMs),
      headers: { "content-type": "application/json", "x-stockquant-service-id": "research-automation-service", authorization: "Bearer " + this.bearerToken },
      body: JSON.stringify(body),
    });
    if (response.status !== 200 && response.status !== 201) { await response.body?.cancel().catch(() => undefined); throw new QuantPromotionSubmitHttpError(response.status); }
    let bytes: Uint8Array;
    try {
      const reader = response.body?.getReader();
      if (!reader) throw new Error("empty response");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 64 * 1024) { await reader.cancel(); throw new Error("response exceeds 64 KiB"); }
        chunks.push(value);
      }
      bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    } catch (error) { throw new Error("Quant promotion response could not be read", { cause: error }); }
    let value: unknown;
    try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch (error) { throw new Error("Quant promotion response is invalid JSON", { cause: error }); }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Quant promotion response must be an object");
    const bodyValue = value as Record<string, unknown>;
    if (bodyValue.schemaVersion !== "v3.2-promotion-request-result-v1" || typeof bodyValue.promotionRequestId !== "string"
      || typeof bodyValue.testRunId !== "string" || bodyValue.status !== "AWAITING_INDEPENDENT_VALIDATION"
      || typeof bodyValue.createdAt !== "string" || typeof bodyValue.idempotent !== "boolean") throw new Error("Quant promotion response does not match its OpenAPI schema");
    return value as Contracts.V32PromotionRequestResult;
  }
}
`;
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("generated-quant-promotion-submit-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Quant Promotion submit OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}: 1 operation`);
