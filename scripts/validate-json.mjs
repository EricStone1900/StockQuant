import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const roots = process.argv.slice(2);

if (roots.length === 0) {
  console.error("usage: node scripts/validate-json.mjs <path>...");
  process.exit(2);
}

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collect(child)));
    } else if (entry.isFile() && extname(entry.name) === ".json") {
      files.push(child);
    }
  }
  return files;
}

let failures = 0;
let checked = 0;
let schemasValidated = 0;
let fixturesValidated = 0;
const parsedFiles = new Map();

for (const root of roots) {
  for (const file of await collect(root)) {
    checked += 1;
    try {
      const value = JSON.parse(await readFile(file, "utf8"));
      parsedFiles.set(resolve(file), value);
    } catch (error) {
      failures += 1;
      console.error(`${file}: ${error.message}`);
    }
  }
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const schemaFiles = [...parsedFiles.entries()]
  .filter(([file, value]) => file.includes(`${join("packages", "contracts")}${"/"}`) && typeof value?.$id === "string")
  .concat([...parsedFiles.entries()].filter(([file, value]) => file.endsWith("fixtures/manifests/fixture-manifest.schema.json") && typeof value?.$id === "string"));

for (const [, schema] of schemaFiles) {
  try {
    ajv.addSchema(schema, schema.$id);
  } catch (error) {
    failures += 1;
    console.error(`${schema.$id}: schema registration failed: ${error.message}`);
  }
}

for (const [file, schema] of schemaFiles) {
  try {
    ajv.compile(schema);
    schemasValidated += 1;
  } catch (error) {
    failures += 1;
    console.error(`${file}: schema validation failed: ${error.message}`);
  }
}

for (const [file, value] of parsedFiles.entries()) {
  if (!file.includes(`${join("fixtures")}${"/"}`) || file.endsWith(".schema.json") || typeof value?.$schema !== "string" || value.$schema.startsWith("http")) continue;
  const schemaFile = resolve(dirname(file), value.$schema);
  const schema = parsedFiles.get(schemaFile);
  if (!schema) {
    failures += 1;
    console.error(`${file}: referenced schema was not found at ${schemaFile}`);
    continue;
  }
  try {
    const valid = ajv.compile(schema)(value);
    fixturesValidated += 1;
    if (!valid) {
      failures += 1;
      console.error(`${file}: fixture does not satisfy ${schemaFile}: ${ajv.errorsText(ajv.errors)}`);
    }
  } catch (error) {
    failures += 1;
    console.error(`${file}: fixture validation failed: ${error.message}`);
  }
}

console.log(`JSON files checked: ${checked}; schemas validated: ${schemasValidated}; fixtures validated: ${fixturesValidated}; failures: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
