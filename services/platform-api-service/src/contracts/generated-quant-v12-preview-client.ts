// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/quant-v12-research-preview.v1.json
import type * as Contracts from "./generated-types.js";

export class QuantV12PreviewHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Quant Research V1.2 preview returned HTTP " + status); this.name = "QuantV12PreviewHttpError"; }
}

export class GeneratedQuantV12PreviewClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly headers: () => Record<string, string>, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Quant Research base URL must be HTTP(S)");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }
  private async call<T>(path: string): Promise<T> {
    const response = await this.request(this.baseUrl + path, { headers: this.headers(), signal: AbortSignal.timeout(5000) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new QuantV12PreviewHttpError(response.status, value);
    return value as T;
  }
  getV12QlibProbe(): Promise<Contracts.V12QlibProbePreview> { return this.call("/v1/qlib/probe"); }
  getV12RDagentProbe(): Promise<Contracts.V12RDagentProbePreview> { return this.call("/v1/rdagent/probe"); }
  getV12FactorPreview(): Promise<Contracts.V12FactorPreview> { return this.call("/v1/factors/preview"); }
}
