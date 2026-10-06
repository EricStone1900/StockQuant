// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/quant-promotions.v1.json
import type * as Contracts from "./generated-types.js";

export class QuantPromotionHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Quant Promotion service returned HTTP " + status); this.name = "QuantPromotionHttpError"; }
}

export class GeneratedQuantPromotionClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly headers: () => Record<string, string>, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Quant Research base URL must be HTTP(S)");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
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
