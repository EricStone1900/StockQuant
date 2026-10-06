import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const document = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/quant-qlib.v1.json"), "utf8"));
const operation = document.paths?.["/v1/research/qlib/fit-fixture"]?.post;
if (document.openapi !== "3.1.0" || operation?.operationId !== "fitQlibFixtureModel" || !operation.security?.some((item) => item.ServiceBearer) || operation.parameters?.find((item) => item.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !JSON.stringify(operation.requestBody).includes("qlib-fit-fixture-request.schema.json") || !JSON.stringify(operation.responses?.["200"]).includes("qlib-fit-fixture-result.schema.json")) throw new Error("Qlib fixture fit OpenAPI operation is incomplete");

const output = resolve(root, "services/platform-api-service/src/contracts/generated-quant-qlib-client.ts");
const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/quant-qlib.v1.json
import type * as Contracts from "./generated-types.js";

export class QuantQlibHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Quant Research Qlib fit returned HTTP " + status); this.name = "QuantQlibHttpError"; }
}

export class GeneratedQuantQlibClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly headers: () => Record<string, string>, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Quant Research base URL must be HTTP(S)");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async fitQlibFixtureModel(body: Contracts.QlibFitFixtureRequest, timeoutMs = 120000): Promise<Contracts.QlibFitFixtureResult> {
    const response = await this.request(this.baseUrl + "/v1/research/qlib/fit-fixture", { method: "POST", headers: { ...this.headers(), "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new QuantQlibHttpError(response.status, value);
    return value as Contracts.QlibFitFixtureResult;
  }
}
`;
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("generated-quant-qlib-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Quant Qlib OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}: fitQlibFixtureModel -> services/platform-api-service/src/contracts/generated-quant-qlib-client.ts`);
