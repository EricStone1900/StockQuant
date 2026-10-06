// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/quant-v14-daily-backtest.v1.json
import type * as Contracts from "./generated-types.js";

export class QuantV14BacktestHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Quant Research V1.4 backtest returned HTTP " + status); this.name = "QuantV14BacktestHttpError"; }
}

export class GeneratedQuantV14BacktestClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly headers: () => Record<string, string>, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Quant Research base URL must be HTTP(S)");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }
  async runV14DailyFixtureBacktest(input: Contracts.V14DailyBacktestFixtureRequest): Promise<Contracts.V14DailyBacktestFixtureResult> {
    const response = await this.request(this.baseUrl + "/v1/research/backtests/daily-fixture", { method: "POST", headers: { ...this.headers(), "content-type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(30000) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new QuantV14BacktestHttpError(response.status, value);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Quant Research V1.4 response must be an object");
    const result = value as Partial<Contracts.V14DailyBacktestFixtureResult>;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(result.testRunId ?? "")
      || result.stageId !== "V1.4" || result.scenarioId !== input.scenarioId || result.seed !== input.seed
      || !["COMPLETED", "FAILED"].includes(String(result.status)) || !Array.isArray(result.assertions)
      || result.assertions.some((item) => !item || typeof item.assertionId !== "string" || !["PASS", "FAIL"].includes(item.status))
      || !result.evidence || typeof result.evidence !== "object" || Array.isArray(result.evidence)) throw new Error("Quant Research V1.4 response does not match its request or result contract");
    return result as Contracts.V14DailyBacktestFixtureResult;
  }
}
