// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/quant-research-qlib-worker.v1.json
import type * as Contracts from "./generated-types.js";

export class QlibWorkerHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Qlib Worker returned HTTP " + status); this.name = "QlibWorkerHttpError"; }
}

export class GeneratedQlibWorkerClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Qlib Worker base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Quant Research Qlib Worker bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }
  async probe(timeoutMs = 3000): Promise<{ status: string; version?: string; detail?: string; dockerSocketMounted?: boolean; codeProbe?: { status: string; result?: string; value?: number; sourceSha256?: string } }> {
    const response = await this.request(this.baseUrl + "/probe", { headers: this.headers(), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new QlibWorkerHttpError(response.status, value);
    return value as { status: string; version?: string; detail?: string; dockerSocketMounted?: boolean; codeProbe?: { status: string; result?: string; value?: number; sourceSha256?: string } };
  }
  async fitFixture(body: Contracts.QlibFitFixtureRequest, timeoutMs = 120000): Promise<Contracts.QlibFitFixtureResult> {
    const response = await this.request(this.baseUrl + "/qlib/fit-fixture", { method: "POST", headers: { ...this.headers(), "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new QlibWorkerHttpError(response.status, value);
    return value as Contracts.QlibFitFixtureResult;
  }
  async trainSummary(body: { bars: Array<{ timestamp?: string; open: string; volume?: number }> }, timeoutMs = 30000): Promise<Record<string, unknown>> {
    return this.postSummary("/train", body, timeoutMs);
  }
  async validateSummary(body: { bars: Array<{ timestamp?: string; open: string; volume?: number }>; artifactHash: string }, timeoutMs = 30000): Promise<Record<string, unknown>> {
    return this.postSummary("/validate", body, timeoutMs);
  }
  private async postSummary(path: string, body: unknown, timeoutMs: number): Promise<Record<string, unknown>> {
    const response = await this.request(this.baseUrl + path, { method: "POST", headers: { ...this.headers(), "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new QlibWorkerHttpError(response.status, value);
    return value as Record<string, unknown>;
  }
  private headers(): Record<string, string> { return { "x-stockquant-service-id": "quant-research-service", authorization: "Bearer " + this.bearerToken }; }
}
