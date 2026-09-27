// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/research-automation-promotions.v1.json
import type * as Contracts from "./generated-types.js";

export class ResearchPromotionHttpError extends Error {
  constructor(readonly status: number, detail?: string) { super("Research Automation promotion submit returned HTTP " + status + (detail ? ": " + detail : "")); this.name = "ResearchPromotionHttpError"; }
}

export class GeneratedResearchPromotionClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Research Automation base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async submitPromotionAfterV31Acceptance(body: Contracts.V32PromotionRequestSubmissionCommand, timeoutMs: number = 10000): Promise<Contracts.V32PromotionRequestSubmissionResult> {
    const response = await this.request(this.baseUrl + "/v1/promotions/submit", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new ResearchPromotionHttpError(response.status, typeof value?.error === "string" ? value.error : undefined);
    return value as Contracts.V32PromotionRequestSubmissionResult;
  }
}
