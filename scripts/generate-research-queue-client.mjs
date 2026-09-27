import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/platform-v33-research-queue.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-research-queue-client.ts");
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
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  if (schema.type === "string") return "string";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  return "unknown";
}
const serverUrl = document.servers?.[0]?.url;
if (typeof serverUrl !== "string" || !serverUrl.includes("research-automation-service")) throw new Error("Expected Research Automation server URL");
const operations = Object.entries(document.paths ?? {}).flatMap(([path, pathItem]) => Object.entries(pathItem).filter(([method]) => ["get", "post", "put", "patch", "delete"].includes(method)).map(([method, operation]) => ({ path, method, operation })))
  .filter(({ operation }) => (operation.servers?.[0]?.url ?? serverUrl).includes("research-automation-service"));
if (operations.length !== 13) throw new Error(`Expected V3.1 Experiment/artifact/model/budget/Runner operations and three V3.3 queue reads, found ${operations.length}`);

const lines = [
  "// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/platform-v33-research-queue.v1.json",
  "import type * as Contracts from \"./generated-types.js\";",
  "",
  "export class ResearchQueueHttpError extends Error {",
  "  constructor(readonly status: number, detail?: string) { super(`Research Automation queue returned HTTP ${status}${detail ? `: ${detail}` : \"\"}`); this.name = \"ResearchQueueHttpError\"; }",
  "}",
  "",
  "export class GeneratedResearchQueueClient {",
  "  private readonly baseUrl: string;",
  "  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {",
  "    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error(\"Research Automation base URL must be HTTP(S)\");",
  "    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error(\"Platform service bearer token is not configured\");",
  "    this.baseUrl = baseUrl.replace(/\\/+$/u, \"\");",
  "  }",
  "",
];
for (const { path, method: verb, operation } of operations) {
  if (!operation.operationId || operation.security?.every((rule) => !rule.ServiceBearer)) throw new Error(`Research Queue operation lacks Platform identity or operationId: ${path}`);
  const params = operation.parameters ?? [];
  const pathParams = params.filter((parameter) => parameter.in === "path");
  const queryParams = params.filter((parameter) => parameter.in === "query");
  const bodySchema = operation.requestBody?.content?.["application/json"]?.schema;
  const successCode = Object.keys(operation.responses ?? {}).find((code) => /^2\d\d$/u.test(code) && operation.responses[code].content?.["application/json"]?.schema);
  const responseSchema = successCode ? operation.responses[successCode].content["application/json"].schema : undefined;
  if (!responseSchema) throw new Error(`Research Queue operation has no typed success response: ${operation.operationId}`);
  const args = [
    ...pathParams.map((parameter) => `${parameter.name}: ${tsType(parameter.schema ?? {})}`),
    ...queryParams.map((parameter) => `${parameter.name}${parameter.required ? "" : "?"}: ${tsType(parameter.schema ?? {})}`),
    ...(bodySchema ? [`body: ${tsType(bodySchema)}`] : []),
  ];
  const timeoutMs = operation["x-timeout-ms"] ?? 5000;
  if (operation["x-timeout-ms"] !== undefined) args.push(`timeoutMs: number = ${timeoutMs}`);
  lines.push(`  async ${operation.operationId}(${args.join(", ")}): Promise<${tsType(responseSchema)}> {`);
  const resolvedPath = pathParams.reduce((expression, parameter) => `${expression}.replace(${JSON.stringify(`{${parameter.name}}`)}, encodeURIComponent(${parameter.name}))`, JSON.stringify(path));
  lines.push(`    const url = new URL(${resolvedPath}, this.baseUrl);`);
  for (const parameter of queryParams) {
    if (parameter.required) lines.push(`    url.searchParams.set(${JSON.stringify(parameter.name)}, String(${parameter.name}));`);
    else lines.push(`    if (${parameter.name} !== undefined) url.searchParams.set(${JSON.stringify(parameter.name)}, String(${parameter.name}));`);
  }
  lines.push(`    return this.send<${tsType(responseSchema)}>(url, \"${verb.toUpperCase()}\"${bodySchema ? ", body" : ""}${operation["x-timeout-ms"] !== undefined ? ", timeoutMs" : ""});`);
  lines.push("  }");
  lines.push("");
}
lines.push(
  "  private async send<T>(url: URL, method: string, body?: unknown, timeoutMs = 5000): Promise<T> {",
  "    const response = await this.request(url, { method, headers: { \"content-type\": \"application/json\", \"x-stockquant-service-id\": \"platform-api-service\", authorization: `Bearer ${this.bearerToken}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(timeoutMs) });",
  "    const value = await response.json().catch(() => ({}));",
  "    if (!response.ok) throw new ResearchQueueHttpError(response.status, typeof value?.error === \"string\" ? value.error : undefined);",
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
console.log(`Research queue OpenAPI client ${checkOnly ? "checked" : "generated"}: ${operations.length} operations -> ${relative(root, output)}`);
