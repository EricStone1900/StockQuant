import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const schemaRoot = join(repoRoot, "packages", "contracts");
const outputDir = join(schemaRoot, "generated");
const tsOutput = join(outputDir, "types.ts");
const pyOutput = join(outputDir, "types.py");
const serviceTsOutputs = [
  join(repoRoot, "services", "portfolio-risk-service", "src", "contracts", "generated-types.ts"),
  join(repoRoot, "services", "platform-api-service", "src", "contracts", "generated-types.ts")
];
const checkOnly = process.argv.includes("--check");

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory() && entry.name !== "generated") files.push(...await collect(child));
    else if (entry.isFile() && entry.name.endsWith(".schema.json")) files.push(child);
  }
  return files;
}

const files = (await collect(schemaRoot)).sort();
const schemas = await Promise.all(files.map(async (file) => ({ file, schema: JSON.parse(await readFile(file, "utf8")) })));
const names = new Map(schemas.map(({ file, schema }) => [basename(file, ".schema.json"), schema.title ?? basename(file, ".schema.json")]));

function typeName(value) {
  return String(value).replace(/(^|[-_.\s])([a-z])/g, (_, _prefix, letter) => letter.toUpperCase()).replace(/[^A-Za-z0-9]/g, "") || "Anonymous";
}

function refName(ref) {
  return typeName(names.get(basename(ref, ".schema.json")) ?? basename(ref, ".schema.json"));
}

function literal(value) {
  return JSON.stringify(value).replace(/"/g, "'");
}

function pythonLiteral(value) {
  if (value === true) return "True";
  if (value === false) return "False";
  if (value === null) return "None";
  return literal(value);
}

function tsType(schema) {
  if (!schema) return "unknown";
  if (schema.$ref) return refName(schema.$ref);
  if (schema.const !== undefined) return literal(schema.const);
  if (schema.enum) return schema.enum.map(literal).join(" | ");
  if (Array.isArray(schema.type)) return schema.type.map((item) => tsType({ type: item })).join(" | ");
  if (schema.type === "null") return "null";
  if (schema.type === "string") return "string";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "array") return `Array<${tsType(schema.items)}>`;
  if (schema.type === "object" || schema.properties) {
    const required = new Set(schema.required ?? []);
    const fields = Object.entries(schema.properties ?? {}).map(([key, value]) => `  ${JSON.stringify(key)}${required.has(key) ? "" : "?"}: ${tsType(value)};`);
    return fields.length ? `{\n${fields.join("\n")}\n}` : "Record<string, unknown>";
  }
  return "unknown";
}

function pyType(schema) {
  if (!schema) return "object";
  if (schema.$ref) return refName(schema.$ref);
  if (schema.const !== undefined) return `Literal[${pythonLiteral(schema.const)}]`;
  if (schema.enum) return `Literal[${schema.enum.map(literal).join(", ")}]`;
  if (Array.isArray(schema.type)) {
    const types = schema.type.filter((item) => item !== "null").map((item) => pyType({ type: item }));
    return `${types[0] ?? "object"}${schema.type.includes("null") ? " | None" : ""}`;
  }
  if (schema.type === "string") return "str";
  if (schema.type === "integer" || schema.type === "number") return schema.type === "integer" ? "int" : "float";
  if (schema.type === "boolean") return "bool";
  if (schema.type === "array") return `list[${pyType(schema.items)}]`;
  if (schema.type === "object" || schema.properties) return "dict[str, object]";
  return "object";
}

function pythonScalarType(schema) {
  if (schema?.type === "integer") return "int";
  if (schema?.type === "number") return "float";
  return pyType(schema);
}

const headerTs = "// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/**/*.schema.json\n\n";
const headerPy = "# GENERATED FILE. DO NOT EDIT. Source: packages/contracts/**/*.schema.json\n\n";
const ts = headerTs + schemas.map(({ schema }) => `export type ${typeName(schema.title)} = ${tsType(schema)}\n`).join("\n");
const py = headerPy + "from typing import Literal, NotRequired, Required, TypedDict\n\n" + schemas.map(({ schema }) => {
  const name = typeName(schema.title);
  const required = new Set(schema.required ?? []);
  const fields = Object.entries(schema.properties ?? {}).map(([key, value]) => `  ${JSON.stringify(key)}: ${required.has(key) ? `Required[${pythonScalarType(value)}]` : `NotRequired[${pythonScalarType(value)}]`}`);
  return `${name} = TypedDict(${JSON.stringify(name)}, {\n${fields.join(",\n")}${fields.length ? "," : ""}\n})\n`;
}).join("\n");

async function ensure(path, expected) {
  let actual = null;
  try { actual = await readFile(path, "utf8"); } catch {}
  if (actual !== expected) {
    if (checkOnly) throw new Error(`${relative(repoRoot, path)} is stale; run pnpm contracts:generate`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, expected);
  }
}

await ensure(tsOutput, ts);
await ensure(pyOutput, py);
for (const output of serviceTsOutputs) await ensure(output, ts);
console.log(`Contract types ${checkOnly ? "checked" : "generated"}: ${schemas.length} schemas -> ${relative(repoRoot, tsOutput)}, ${relative(repoRoot, pyOutput)}, ${serviceTsOutputs.map((output) => relative(repoRoot, output)).join(", ")}`);
