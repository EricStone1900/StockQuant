// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/quant-promotions.v1.json
import type * as Contracts from "./generated-types.js";

export type QuantRegistryLookupResult = { status: number; body?: Contracts.V32PromotionRegistryVersion | Record<string, unknown> };

export class GeneratedQuantRegistryClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Quant Research base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Decision Governance service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async getApprovedPromotionRegistryVersion(versionFingerprint: string, timeoutMs: number = 3000): Promise<QuantRegistryLookupResult> {
    if (!/^[a-f0-9]{64}$/u.test(versionFingerprint)) throw new Error("Registry version fingerprint must be a lowercase SHA-256");
    const response = await this.request(this.baseUrl + "/v1/registry/versions/" + encodeURIComponent(versionFingerprint), { headers: { "x-stockquant-service-id": "decision-governance-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.json().catch(() => undefined) as Contracts.V32PromotionRegistryVersion | Record<string, unknown> | undefined;
    return { status: response.status, body };
  }
}
