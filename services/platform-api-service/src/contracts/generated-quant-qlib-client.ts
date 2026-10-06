// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/quant-qlib.v1.json
import type * as Contracts from "./generated-types.js";

export class QuantQlibHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Quant Research Qlib fit returned HTTP " + status); this.name = "QuantQlibHttpError"; }
}

export class GeneratedQuantQlibClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly headers: () => Record<string, string>, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Quant Research base URL must be HTTP(S)");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async fitQlibFixtureModel(body: Contracts.QlibFitFixtureRequest, timeoutMs = 120000): Promise<Contracts.QlibFitFixtureResult> {
    const response = await this.request(this.baseUrl + "/v1/research/qlib/fit-fixture", { method: "POST", headers: { ...this.headers(), "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new QuantQlibHttpError(response.status, value);
    return value as Contracts.QlibFitFixtureResult;
  }
}
