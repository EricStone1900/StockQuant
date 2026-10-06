import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/quant-v14-daily-backtest.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-quant-v14-backtest-client.ts");
const doc = JSON.parse(await readFile(source, "utf8"));
const operation = doc.paths?.["/v1/research/backtests/daily-fixture"]?.post;
if (operation?.operationId !== "runV14DailyFixtureBacktest" || !operation.security?.some((item) => item.ServiceBearer)
  || operation.parameters?.find((item) => item.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service"
  || !JSON.stringify(operation.requestBody).includes("V14DailyBacktestRequest")
  || !JSON.stringify(operation.responses?.["200"]).includes("V14DailyBacktestResult")
  || !JSON.stringify(doc.components?.schemas?.V14DailyBacktestRequest).includes("v14-daily-backtest-request.schema.json")
  || !JSON.stringify(doc.components?.schemas?.V14DailyBacktestResult).includes("v14-daily-backtest-result.schema.json")
  || !operation.responses?.["403"] || !operation.responses?.["413"] || !operation.responses?.["422"]) throw new Error("V1.4 Quant backtest OpenAPI operation is incomplete");

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/quant-v14-daily-backtest.v1.json
import type * as Contracts from "./generated-types.js";

export class QuantV14BacktestHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Quant Research V1.4 backtest returned HTTP " + status); this.name = "QuantV14BacktestHttpError"; }
}

export class GeneratedQuantV14BacktestClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly headers: () => Record<string, string>, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Quant Research base URL must be HTTP(S)");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
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
`;
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("generated-quant-v14-backtest-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`V1.4 Quant Research OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}: daily fixture backtest`);
