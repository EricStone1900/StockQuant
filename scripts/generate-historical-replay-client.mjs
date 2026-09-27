import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/historical-replay-worker.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-historical-replay-client.ts");
const checkOnly = process.argv.includes("--check");

async function collect(path) {
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...await collect(child));
    else if (entry.isFile() && entry.name.endsWith(".schema.json")) files.push(child);
  }
  return files;
}
const names = new Map();
for (const file of await collect(resolve(root, "packages/contracts"))) {
  const schema = JSON.parse(await readFile(file, "utf8"));
  names.set(basename(file), schema.title?.replace(/(^|[-_.\s])([a-z])/g, (_, _p, c) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, "") ?? "unknown");
}
const document = JSON.parse(await readFile(source, "utf8"));
function tsType(schema) {
  if (schema.$ref) {
    const name = names.get(basename(schema.$ref));
    if (!name) throw new Error(`Unknown OpenAPI schema reference: ${schema.$ref}`);
    return `Contracts.${name}`;
  }
  if (schema.oneOf || schema.anyOf) return `(${(schema.oneOf ?? schema.anyOf).map(tsType).join(" | ")})`;
  if (schema.allOf) return `(${schema.allOf.map(tsType).join(" & ")})`;
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  if (schema.type === "string") return "string";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "array") return `Array<${tsType(schema.items ?? {})}>`;
  if (schema.type === "object" || schema.properties) {
    const required = new Set(schema.required ?? []);
    const props = Object.entries(schema.properties ?? {}).map(([key, value]) => `  ${JSON.stringify(key)}${required.has(key) ? "" : "?"}: ${tsType(value)};`);
    return props.length ? `\n${props.join("\n")}\n` : "Record<string, unknown>";
  }
  return "unknown";
}
const verbs = new Set(["get", "post", "put", "patch", "delete"]);
const operations = Object.entries(document.paths ?? {}).flatMap(([path, item]) => Object.entries(item).filter(([verb]) => verbs.has(verb)).map(([verb, operation]) => ({ path, verb, operation })));
if (operations.length !== 5) throw new Error(`Expected five Historical Replay operations, found ${operations.length}`);
const lines = [
  "// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/historical-replay-worker.v1.json",
  "import type * as Contracts from \"./generated-types.js\";",
  "",
  "export class HistoricalReplayHttpError extends Error {",
  "  constructor(readonly status: number) { super(`Historical Replay Worker returned HTTP ${status}`); this.name = \"HistoricalReplayHttpError\"; }",
  "}",
  "",
  "export class GeneratedHistoricalReplayClient {",
  "  private readonly baseUrl: string;",
  "  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {",
  "    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error(\"historical replay base URL must be HTTP(S)\");",
  "    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error(\"platform service bearer token is not configured\");",
  "    this.baseUrl = baseUrl.replace(/\\/+$/u, \"\");",
  "  }",
  "",
];
for (const { path, verb, operation } of operations) {
  if (!operation.operationId || operation.security?.every((rule) => !rule.ServiceBearer)) throw new Error(`Historical Replay operation lacks identity/operationId: ${path}`);
  const params = operation.parameters ?? [];
  const pathParams = params.filter((item) => item.in === "path");
  const queryParams = params.filter((item) => item.in === "query");
  const body = operation.requestBody?.content?.["application/json"]?.schema;
  const response = operation.responses?.["200"]?.content?.["application/json"]?.schema;
  if (!response) throw new Error(`Historical Replay operation has no typed 200 response: ${operation.operationId}`);
  const args = [
    ...pathParams.map((item) => `${item.name}: ${tsType(item.schema ?? {})}`),
    ...(body ? [`body: ${tsType(body)}`] : []),
    ...queryParams.map((item) => `${item.name === "async" ? "asynchronous" : item.name}?: boolean`),
  ];
  const template = path.replace(/\{([A-Za-z0-9_]+)\}/gu, "${encodeURIComponent($1)}");
  const query = queryParams.length ? ` + (asynchronous ? \"?async=true\" : \"\")` : "";
  lines.push(`  async ${operation.operationId}(${args.join(", ")}): Promise<${tsType(response)}> {`);
  lines.push(`    const path = \`${template}\`${query};`);
  lines.push(`    return this.send<${tsType(response)}>(\"${verb.toUpperCase()}\", path${body ? ", body" : ""});`);
  lines.push("  }");
  lines.push("");
}
lines.push(
  "  private async send<T>(method: string, path: string, body?: unknown): Promise<T> {",
  "    const response = await this.request(`${this.baseUrl}${path}`, { method, headers: { \"content-type\": \"application/json\", \"x-stockquant-service-id\": \"platform-api-service\", authorization: `Bearer ${this.bearerToken}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });",
  "    const value = await response.json().catch(() => ({}));",
  "    if (!response.ok) throw new HistoricalReplayHttpError(response.status);",
  "    return value as T;",
  "  }",
  "}",
  "",
);
const expected = lines.join("\n");
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error(`${relative(root, output)} is stale; run pnpm contracts:generate`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Historical Replay OpenAPI client ${checkOnly ? "checked" : "generated"}: ${operations.length} operations -> ${relative(root, output)}`);
