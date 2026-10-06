// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/replay-governance-quant.v1.json
import type * as Contracts from "./generated-types.js";

export class ReplayDependencyHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Replay dependency returned HTTP " + status); this.name = "ReplayDependencyHttpError"; }
}

export class GeneratedReplayDependenciesClient {
  private readonly governanceUrl: string;
  private readonly quantResearchUrl: string;
  constructor(governanceUrl: string, quantResearchUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(governanceUrl) || !/^https?:\/\//u.test(quantResearchUrl)) throw new Error("Replay dependency base URLs must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Historical Replay service bearer token is not configured");
    this.governanceUrl = governanceUrl.replace(/\/+$/u, "");
    this.quantResearchUrl = quantResearchUrl.replace(/\/+$/u, "");
  }
  async authorizeHistoricalReplayExecution(body: Contracts.ReplayExecutionAuthorizationCommand, timeoutMs = 5000): Promise<Contracts.ReplayExecutionAuthorizationResult> {
    return this.call(this.governanceUrl + "/internal/v1/authorizations", body, timeoutMs);
  }
  async summarizeHistoricalReplayBars(body: Contracts.MultiBarResearchCommand, timeoutMs = 120000): Promise<Contracts.MultiBarResearchResult> {
    return this.call(this.quantResearchUrl + "/v1/research/multi-bar", body, timeoutMs);
  }
  private async call<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
    const response = await this.request(url, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new ReplayDependencyHttpError(response.status, value);
    return value as T;
  }
}
