// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/platform-v33-research-queue.v1.json
import type * as Contracts from "./generated-types.js";

export class ResearchQueueHttpError extends Error {
  constructor(readonly status: number, detail?: string) { super(`Research Automation queue returned HTTP ${status}${detail ? `: ${detail}` : ""}`); this.name = "ResearchQueueHttpError"; }
}

export class GeneratedResearchQueueClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Research Automation base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async createV31Experiment(body: Contracts.V31ExperimentRequest): Promise<Contracts.V31ExperimentResult> {
    const url = new URL("/v1/experiments", this.baseUrl);
    return this.send<Contracts.V31ExperimentResult>(url, "POST", body);
  }

  async readV31ExperimentBudget(experimentId: string): Promise<Contracts.V31ExperimentBudgetResult> {
    const url = new URL("/v1/experiments/{experimentId}/budget".replace("{experimentId}", encodeURIComponent(experimentId)), this.baseUrl);
    return this.send<Contracts.V31ExperimentBudgetResult>(url, "GET");
  }

  async settleV31ExperimentBudget(experimentId: string, body: Contracts.V31ExperimentBudgetSettleCommand): Promise<Contracts.V31ExperimentBudgetResult> {
    const url = new URL("/v1/experiments/{experimentId}/budget/settle".replace("{experimentId}", encodeURIComponent(experimentId)), this.baseUrl);
    return this.send<Contracts.V31ExperimentBudgetResult>(url, "POST", body);
  }

  async cancelV31Experiment(experimentId: string): Promise<Contracts.V31ExperimentCancellationResult> {
    const url = new URL("/v1/experiments/{experimentId}/cancel".replace("{experimentId}", encodeURIComponent(experimentId)), this.baseUrl);
    return this.send<Contracts.V31ExperimentCancellationResult>(url, "POST");
  }

  async listRunnerJobsForTestRun(testRunId: string, offset?: number, limit?: number): Promise<Contracts.V33RunnerQueue> {
    const url = new URL("/v1/runner/jobs", this.baseUrl);
    url.searchParams.set("testRunId", String(testRunId));
    if (offset !== undefined) url.searchParams.set("offset", String(offset));
    if (limit !== undefined) url.searchParams.set("limit", String(limit));
    return this.send<Contracts.V33RunnerQueue>(url, "GET");
  }

  async submitV31RunnerJob(body: Contracts.V31RunnerJob, timeoutMs: number = 10000): Promise<Contracts.V31RunnerJobDispatchResult> {
    const url = new URL("/v1/runner/jobs", this.baseUrl);
    return this.send<Contracts.V31RunnerJobDispatchResult>(url, "POST", body, timeoutMs);
  }

  async readV31RunnerJob(jobId: string): Promise<Contracts.V31RunnerJobRecord> {
    const url = new URL("/v1/runner/jobs/{jobId}".replace("{jobId}", encodeURIComponent(jobId)), this.baseUrl);
    return this.send<Contracts.V31RunnerJobRecord>(url, "GET");
  }

  async cancelV31RunnerJob(jobId: string): Promise<Contracts.V31RunnerJobDispatchResult> {
    const url = new URL("/v1/runner/jobs/{jobId}".replace("{jobId}", encodeURIComponent(jobId)), this.baseUrl);
    return this.send<Contracts.V31RunnerJobDispatchResult>(url, "POST");
  }

  async readRunnerBudgetForTestRun(testRunId: string, offset?: number, limit?: number): Promise<Contracts.V33RunnerBudget> {
    const url = new URL("/v1/runner/budgets", this.baseUrl);
    url.searchParams.set("testRunId", String(testRunId));
    if (offset !== undefined) url.searchParams.set("offset", String(offset));
    if (limit !== undefined) url.searchParams.set("limit", String(limit));
    return this.send<Contracts.V33RunnerBudget>(url, "GET");
  }

  async publishV31Artifact(body: Contracts.V31ArtifactPublishCommand, timeoutMs: number = 10000): Promise<Contracts.V31ArtifactPublishResult> {
    const url = new URL("/v1/artifacts/publish", this.baseUrl);
    return this.send<Contracts.V31ArtifactPublishResult>(url, "POST", body, timeoutMs);
  }

  async readV31Artifact(body: Contracts.V31ArtifactReadCommand): Promise<Contracts.V31RunnerInputResponse> {
    const url = new URL("/v1/artifacts/read", this.baseUrl);
    return this.send<Contracts.V31RunnerInputResponse>(url, "POST", body);
  }

  async callV31ModelGatewayFixture(body: Contracts.V31ModelGatewayFixtureCommand, timeoutMs: number = 10000): Promise<Contracts.V31ModelGatewayFixtureResult> {
    const url = new URL("/v1/model-gateway/fixture-call", this.baseUrl);
    return this.send<Contracts.V31ModelGatewayFixtureResult>(url, "POST", body, timeoutMs);
  }

  async listRunnerJobsForTestRunAfterCursor(testRunId: string, afterCursor?: string, limit?: number): Promise<Contracts.V33RunnerCursorQueue> {
    const url = new URL("/v1/runner/jobs/cursor", this.baseUrl);
    url.searchParams.set("testRunId", String(testRunId));
    if (afterCursor !== undefined) url.searchParams.set("afterCursor", String(afterCursor));
    if (limit !== undefined) url.searchParams.set("limit", String(limit));
    return this.send<Contracts.V33RunnerCursorQueue>(url, "GET");
  }

  private async send<T>(url: URL, method: string, body?: unknown, timeoutMs = 5000): Promise<T> {
    const response = await this.request(url, { method, headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${this.bearerToken}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new ResearchQueueHttpError(response.status, typeof value?.error === "string" ? value.error : undefined);
    return value as T;
  }
}
