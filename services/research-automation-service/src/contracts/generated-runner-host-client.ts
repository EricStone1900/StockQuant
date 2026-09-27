// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/research-automation-runner-host.v1.json
import type * as Contracts from "./generated-types.js";

export class RunnerHostHttpError extends Error {
  constructor(readonly status: number) { super(`Runner Host API returned HTTP ${status}`); this.name = "RunnerHostHttpError"; }
}

export class GeneratedRunnerHostClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("runner API base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("runner host bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async claimRunnerJob(body: Contracts.V31RunnerClaimCommand): Promise<({
  "status": "NO_WORK";
} | (Contracts.V31RunnerJobRecord & {
  "claimStatus": "LEASED";
}))> {
    const path = `/v1/runner/jobs/claim`;
    return this.send<({
  "status": "NO_WORK";
} | (Contracts.V31RunnerJobRecord & {
  "claimStatus": "LEASED";
}))>("POST", path, body);
  }

  async readLeasedRunnerInput(jobId: string, body: Contracts.V31RunnerInputRequest): Promise<Contracts.V31RunnerInputResponse> {
    const path = `/v1/runner/jobs/${encodeURIComponent(jobId)}/input`;
    return this.send<Contracts.V31RunnerInputResponse>("POST", path, body);
  }

  async renewRunnerJobLease(jobId: string, body: Contracts.V31RunnerInputRequest): Promise<(Contracts.V31RunnerJobRecord & {
  "claimStatus": "LEASED";
})> {
    const path = `/v1/runner/jobs/${encodeURIComponent(jobId)}/heartbeat`;
    return this.send<(Contracts.V31RunnerJobRecord & {
  "claimStatus": "LEASED";
})>("POST", path, body);
  }

  async completeLeasedRunnerJob(jobId: string, body: Contracts.V31RunnerCompleteCommand): Promise<Contracts.V31RunnerJobRecord> {
    const path = `/v1/runner/jobs/${encodeURIComponent(jobId)}/complete`;
    return this.send<Contracts.V31RunnerJobRecord>("POST", path, body);
  }

  private async send<T>(method: string, path: string, body: unknown): Promise<T> {
    const response = await this.request(`${this.baseUrl}${path}`, {
      method, headers: { "content-type": "application/json", "x-stockquant-service-id": "runner-host", authorization: `Bearer ${this.bearerToken}` },
      body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
    });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new RunnerHostHttpError(response.status);
    return value as T;
  }
}
