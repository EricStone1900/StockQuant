// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/historical-replay-worker.v1.json
import type * as Contracts from "./generated-types.js";

export class HistoricalReplayHttpError extends Error {
  constructor(readonly status: number) { super(`Historical Replay Worker returned HTTP ${status}`); this.name = "HistoricalReplayHttpError"; }
}

export class GeneratedHistoricalReplayClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("historical replay base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async startHistoricalReplay(body: Contracts.HistoricalReplayCommand): Promise<Record<string, unknown>> {
    const path = `/internal/v1/replays`;
    return this.send<Record<string, unknown>>("POST", path, body);
  }

  async startHistoricalMultiBarReplay(body: Contracts.HistoricalReplayMultiCommand, asynchronous?: boolean): Promise<Record<string, unknown>> {
    const path = `/internal/v1/replays/multi` + (asynchronous ? "?async=true" : "");
    return this.send<Record<string, unknown>>("POST", path, body);
  }

  async readHistoricalReplayRun(testRunId: string): Promise<Contracts.HistoricalReplayRun> {
    const path = `/internal/v1/replays/${encodeURIComponent(testRunId)}`;
    return this.send<Contracts.HistoricalReplayRun>("GET", path);
  }

  async controlHistoricalReplayRun(testRunId: string, action: "pause" | "resume" | "cancel"): Promise<Contracts.HistoricalReplayRun> {
    const path = `/internal/v1/replays/${encodeURIComponent(testRunId)}/${encodeURIComponent(action)}`;
    return this.send<Contracts.HistoricalReplayRun>("POST", path);
  }

  async recoverHistoricalReplayUnknownOrder(testRunId: string): Promise<Record<string, unknown>> {
    const path = `/internal/v1/replays/${encodeURIComponent(testRunId)}/recover-unknown`;
    return this.send<Record<string, unknown>>("POST", path);
  }

  private async send<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.request(`${this.baseUrl}${path}`, { method, headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${this.bearerToken}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new HistoricalReplayHttpError(response.status);
    return value as T;
  }
}
