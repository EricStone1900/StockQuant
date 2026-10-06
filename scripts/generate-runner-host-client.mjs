import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const documentPath = resolve(root, "packages/contracts/openapi/research-automation-runner-host.v1.json");
const outputPath = resolve(root, "services/research-automation-service/src/contracts/generated-runner-host-client.ts");
const checkOnly = process.argv.includes("--check");

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...await collect(child));
    else if (entry.isFile() && entry.name.endsWith(".schema.json")) files.push(child);
  }
  return files;
}

const schemaFiles = await collect(resolve(root, "packages/contracts"));
const schemaNames = new Map();
for (const file of schemaFiles) {
  const schema = JSON.parse(await readFile(file, "utf8"));
  schemaNames.set(basename(file), schema.title?.replace(/(^|[-_.\s])([a-z])/g, (_, _p, c) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, "") ?? "unknown");
}
const document = JSON.parse(await readFile(documentPath, "utf8"));

function tsType(schema) {
  if (schema.$ref) {
    const name = schemaNames.get(basename(schema.$ref));
    if (!name) throw new Error(`Unknown OpenAPI schema reference: ${schema.$ref}`);
    return `Contracts.${name}`;
  }
  if (schema.oneOf || schema.anyOf) return `(${(schema.oneOf ?? schema.anyOf).map(tsType).join(" | ")})`;
  if (schema.allOf) return `(${schema.allOf.map(tsType).join(" & ")})`;
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  if (Array.isArray(schema.type)) return schema.type.map((type) => type === "null" ? "null" : tsType({ type })).join(" | ");
  if (schema.type === "null") return "null";
  if (schema.type === "string") return "string";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "array") return `Array<${tsType(schema.items ?? {})}>`;
  if (schema.type === "object" || schema.properties) {
    const required = new Set(schema.required ?? []);
    const fields = Object.entries(schema.properties ?? {}).map(([name, value]) => `  ${JSON.stringify(name)}${required.has(name) ? "" : "?"}: ${tsType(value)};`);
    return fields.length ? `{\n${fields.join("\n")}\n}` : "Record<string, unknown>";
  }
  return "unknown";
}

const lines = [
  "// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/research-automation-runner-host.v1.json",
  "import type * as Contracts from \"./generated-types.js\";",
  "",
  "export class RunnerHostHttpError extends Error {",
  "  constructor(readonly status: number) { super(`Runner Host API returned HTTP ${status}`); this.name = \"RunnerHostHttpError\"; }",
  "}",
  "",
  "export class GeneratedRunnerHostClient {",
  "  private readonly baseUrl: string;",
  "  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {",
  "    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error(\"runner API base URL must be HTTP(S)\");",
  "    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error(\"runner host bearer token is not configured\");",
  "    this.baseUrl = baseUrl.replace(/\\/+$/u, \"\");",
  "  }",
  "",
];

const operationCount = Object.values(document.paths ?? {}).reduce((count, item) => count + Object.keys(item).filter((method) => ["get", "post", "put", "patch", "delete"].includes(method)).length, 0);
if (operationCount !== 7) throw new Error(`Expected seven Runner Host lifecycle, checkpoint, and Artifact operations, found ${operationCount}`);
for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
    if (!operation.operationId || operation.security?.every((rule) => !rule.ServiceBearer)) throw new Error(`Runner Host operation is missing identity or operationId: ${path}`);
    const operationName = operation.operationId[0].toUpperCase() + operation.operationId.slice(1);
    const pathParameters = (operation.parameters ?? []).filter((parameter) => parameter.in === "path");
    const bodySchema = operation.requestBody?.content?.["application/json"]?.schema;
    const responseSchema = (operation.responses?.["200"] ?? operation.responses?.["201"])?.content?.["application/json"]?.schema;
    if (!responseSchema) throw new Error(`Runner Host operation has no JSON 200 response: ${operation.operationId}`);
    const args = [
      ...pathParameters.map((parameter) => `${parameter.name}: ${tsType(parameter.schema ?? {})}`),
      ...(bodySchema ? [`body: ${tsType(bodySchema)}`] : []),
    ];
    const urlPath = `\`${path.replace(/\{([A-Za-z0-9_]+)\}/gu, "${encodeURIComponent($1)}")}\``;
    const timeoutParameter = operation.operationId === "publishRunnerOutputArtifact" ? "timeoutMs = 30_000" : "";
    lines.push(`  async ${operation.operationId}(${[...args, ...(timeoutParameter ? [timeoutParameter] : [])].join(", ")}): Promise<${tsType(responseSchema)}> {`);
    lines.push(`    const path = ${urlPath};`);
    lines.push(`    return this.send<${tsType(responseSchema)}>(\"${method.toUpperCase()}\", path${bodySchema ? ", body" : ""}${timeoutParameter ? ", timeoutMs" : ""});`);
    lines.push("  }");
    lines.push("");
  }
}

lines.push(
  "  private async send<T>(method: string, path: string, body: unknown, timeoutMs = 5000): Promise<T> {",
  "    const response = await this.request(`${this.baseUrl}${path}`, {",
  "      method, headers: { \"content-type\": \"application/json\", \"x-stockquant-service-id\": \"runner-host\", authorization: `Bearer ${this.bearerToken}` },",
  "      body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),",
  "    });",
  "    const value = await response.json().catch(() => ({}));",
  "    if (!response.ok) throw new RunnerHostHttpError(response.status);",
  "    return value as T;",
  "  }",
  "}",
  "",
);

const expected = lines.join("\n");
let actual = null;
try { actual = await readFile(outputPath, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error(`${relative(root, outputPath)} is stale; run pnpm contracts:generate`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, expected);
}
console.log(`Runner Host OpenAPI client ${checkOnly ? "checked" : "generated"}: ${operationCount} operations -> ${relative(root, outputPath)}`);
