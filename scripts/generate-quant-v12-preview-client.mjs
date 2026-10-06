import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/quant-v12-research-preview.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-quant-v12-preview-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operations = [
  ["/v1/qlib/probe", "getV12QlibProbe", "v12-qlib-probe-preview.schema.json"],
  ["/v1/rdagent/probe", "getV12RDagentProbe", "v12-rdagent-probe-preview.schema.json"],
  ["/v1/factors/preview", "getV12FactorPreview", "v12-factor-preview.schema.json"]
];
for (const [path, operationId, schema] of operations) {
  const operation = document.paths?.[path]?.get;
  if (operation?.operationId !== operationId || !operation.security?.some((entry) => entry.ServiceBearer) || operation.parameters?.find((item) => item.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !JSON.stringify(operation.responses?.["200"]).includes(schema) || !operation.responses?.["401"]) throw new Error(`V1.2 Quant preview operation incomplete: ${operationId}`);
}

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/quant-v12-research-preview.v1.json
import type * as Contracts from "./generated-types.js";

export class QuantV12PreviewHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Quant Research V1.2 preview returned HTTP " + status); this.name = "QuantV12PreviewHttpError"; }
}

export class GeneratedQuantV12PreviewClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly headers: () => Record<string, string>, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Quant Research base URL must be HTTP(S)");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
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
`;
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("generated-quant-v12-preview-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`V1.2 Quant Research OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}: ${operations.length} operations`);
