import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/portfolio-account.v1.json");
const outputs = [
  resolve(root, "services/platform-api-service/src/contracts/generated-portfolio-account-client.ts"),
  resolve(root, "services/trade-execution-service/src/contracts/generated-portfolio-account-client.ts"),
  resolve(root, "services/historical-replay-worker/src/contracts/generated-portfolio-account-client.ts"),
];
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
if (document.openapi !== "3.1.0" || !document.security?.some((item) => item.ServiceBearer)) throw new Error("Portfolio Account OpenAPI must use service Bearer security");

function tsType(schema) {
  if (schema.$ref) {
    const name = names.get(basename(schema.$ref));
    if (!name) throw new Error(`Unknown Portfolio Account schema reference: ${schema.$ref}`);
    return `Contracts.${name}`;
  }
  if (Array.isArray(schema.type)) return schema.type.map((type) => tsType({ ...schema, type })).join(" | ");
  if (schema.oneOf || schema.anyOf) return `(${(schema.oneOf ?? schema.anyOf).map(tsType).join(" | ")})`;
  if (schema.allOf) return `(${schema.allOf.map(tsType).join(" & ")})`;
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  if (schema.type === "string") return "string";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "null") return "null";
  if (schema.type === "array") return `Array<${tsType(schema.items ?? {})}>`;
  if (schema.type === "object" || schema.properties) {
    const required = new Set(schema.required ?? []);
    const props = Object.entries(schema.properties ?? {}).map(([key, value]) => `  ${JSON.stringify(key)}${required.has(key) ? "" : "?"}: ${tsType(value)};`);
    return props.length ? `{ ${props.map((prop) => prop.trim()).join(" ")} }` : "Record<string, unknown>";
  }
  return "unknown";
}

const verbs = new Set(["get", "post", "put", "patch", "delete"]);
const operations = Object.entries(document.paths ?? {}).flatMap(([path, item]) => Object.entries(item)
  .filter(([verb]) => verbs.has(verb))
  .map(([verb, operation]) => ({ path, verb, operation })));
if (operations.length !== 8) throw new Error(`Expected eight Portfolio Account operations, found ${operations.length}`);

const lines = [
  "// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/portfolio-account.v1.json",
  "import type * as Contracts from \"./generated-types.js\";",
  "",
  "export type PortfolioAccountCaller = \"platform-api-service\" | \"trade-execution-service\" | \"historical-replay-worker\";",
  "",
  "export class PortfolioAccountClientError extends Error {",
  "  constructor(readonly status: number, readonly body: unknown) { super(`Portfolio Risk returned HTTP ${status}`); this.name = \"PortfolioAccountClientError\"; }",
  "}",
  "",
  "export class GeneratedPortfolioAccountClient {",
  "  private readonly baseUrl: string;",
  "  constructor(baseUrl: string, private readonly callerId: PortfolioAccountCaller, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {",
  "    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error(\"portfolio base URL must be HTTP(S)\");",
  "    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error(\"portfolio service bearer token is not configured\");",
  "    this.baseUrl = baseUrl.replace(/\\/+$/u, \"\");",
  "  }",
  "",
];

for (const { path, verb, operation } of operations) {
  const security = operation.security ?? document.security;
  if (!operation.operationId || !security?.some((rule) => rule.ServiceBearer)) throw new Error(`Portfolio operation lacks inherited ServiceBearer/operationId: ${path}`);
  const parameters = operation.parameters ?? [];
  const pathParams = parameters.filter((item) => item.in === "path");
  const headerParams = parameters.filter((item) => item.in === "header");
  const queryParams = parameters.filter((item) => item.in === "query");
  const body = operation.requestBody?.content?.["application/json"]?.schema;
  const successResponses = Object.entries(operation.responses ?? {}).filter(([status]) => status.startsWith("2"));
  const responseSchemas = successResponses.map(([, response]) => response.content?.["application/json"]?.schema).filter(Boolean);
  if (responseSchemas.length === 0) throw new Error(`Portfolio operation has no typed success response: ${operation.operationId}`);
  const responseType = [...new Set(responseSchemas.map(tsType))].join(" | ");
  const methodArgs = [
    ...pathParams.map((item) => `${item.name}: ${tsType(item.schema ?? {})}`),
    ...headerParams.map((item) => `${item.name === "x-stockquant-owner-id" ? "ownerId" : item.name}: ${tsType(item.schema ?? {})}`),
    ...queryParams.map((item) => `${item.name}: ${tsType(item.schema ?? {})}`),
    ...(body ? [`body: ${tsType(body)}`] : []),
  ];
  const route = path.replace(/\{([A-Za-z0-9_]+)\}/gu, (_, key) => `\${encodeURIComponent(${key})}`);
  const headers = headerParams.length ? `, { ${headerParams.map((item) => `"${item.name}": ${item.name === "x-stockquant-owner-id" ? "ownerId" : item.name}`).join(", ")} }` : "";
  lines.push(`  async ${operation.operationId}(${methodArgs.join(", ")}): Promise<${responseType}> {`);
  lines.push(`    const path = \`${route}\`${queryParams.length ? ` + "?" + new URLSearchParams({ ${queryParams.map((item) => item.name).join(", ")} }).toString()` : ""};`);
  lines.push(`    return this.send<${responseType}>("${verb.toUpperCase()}", path${body ? ", body" : ", undefined"}${headers});`);
  lines.push("  }");
  lines.push("");
}

lines.push(
  "  private async send<T>(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {",
  "    const response = await this.request(`${this.baseUrl}${path}`, { method, headers: { \"content-type\": \"application/json\", \"x-stockquant-service-id\": this.callerId, authorization: `Bearer ${this.bearerToken}`, ...extraHeaders }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });",
  "    const value = await response.json().catch(() => null);",
  "    if (!response.ok) throw new PortfolioAccountClientError(response.status, value);",
  "    return value as T;",
  "  }",
  "}",
  "",
);

const expected = lines.join("\n");
for (const output of outputs) {
  let actual;
  try { actual = await readFile(output, "utf8"); } catch {}
  if (actual !== expected) {
    if (checkOnly) throw new Error(`${relative(root, output)} is stale; run pnpm contracts:generate`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, expected);
  }
}
console.log(`Portfolio Account OpenAPI client ${checkOnly ? "checked" : "generated"}: ${operations.length} operations -> ${outputs.map((output) => relative(root, output)).join(", ")}`);
