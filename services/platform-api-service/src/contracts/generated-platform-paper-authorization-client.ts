// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/decision-governance-paper-authorization.v1.json
import type * as Contracts from "./generated-types.js";

export type PlatformPaperAuthorizationResponse = { status: number; body?: Contracts.V24PaperAuthorizationResult | Record<string, unknown> };

export class GeneratedPlatformPaperAuthorizationClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async authorizeV24PaperFixtureRun(body: Contracts.V24PaperAuthorizationCommand, timeoutMs: number = 5000): Promise<PlatformPaperAuthorizationResponse> {
    const response = await this.request(this.baseUrl + "/internal/v1/paper-authorizations", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as Contracts.V24PaperAuthorizationResult | Record<string, unknown> | undefined;
    return { status: response.status, body: value };
  }
}
