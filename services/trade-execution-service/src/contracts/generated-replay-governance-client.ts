// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/replay-governance-quant.v1.json
import type * as Contracts from "./generated-types.js";

export class GeneratedReplayGovernanceClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Trade Execution service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }
  validateHistoricalReplayExecution(body: Contracts.ReplayExecutionAuthorizationValidation, timeoutMs = 5000): Promise<Response> {
    return this.request(this.baseUrl + "/internal/v1/authorizations/validate", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  }
}
