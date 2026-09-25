import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const matrix = JSON.parse(await readFile(resolve(root, "packages/contracts/compatibility-matrix.json"), "utf8"));
const generatedTs = await readFile(resolve(root, "packages/contracts/generated/types.ts"), "utf8");
const generatedPy = await readFile(resolve(root, "packages/contracts/generated/types.py"), "utf8");

function typeName(value) {
  return String(value).replace(/(^|[-_.\s])([a-z])/g, (_, _prefix, letter) => letter.toUpperCase()).replace(/[^A-Za-z0-9]/g, "") || "Anonymous";
}

for (const rule of matrix.rules) {
  const schemaPath = resolve(root, "packages/contracts", rule.schema);
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const properties = schema.properties ?? {};
  for (const property of rule.requiredProperties ?? []) {
    if (!Object.hasOwn(properties, property)) throw new Error(`${rule.consumer}: ${rule.schema} removed required compatibility property ${property}`);
  }
  for (const property of rule.stableProperties ?? []) {
    if (!Object.hasOwn(properties, property)) throw new Error(`${rule.consumer}: ${rule.schema} removed stable property ${property}`);
  }
  for (const [property, values] of Object.entries(rule.stableEnums ?? {})) {
    const current = properties[property]?.enum ?? (properties[property]?.const === undefined ? [] : [properties[property].const]);
    for (const value of values) if (!current.includes(value)) throw new Error(`${rule.consumer}: ${rule.schema}.${property} removed stable value ${value}`);
  }
  const generatedName = typeName(schema.title ?? rule.schema.split("/").at(-1).replace(".schema.json", ""));
  if (!generatedTs.includes(`export type ${generatedName} =`)) throw new Error(`generated TS type missing: ${generatedName}`);
  if (!generatedPy.includes(`${generatedName} =`)) throw new Error(`generated Python type missing: ${generatedName}`);
}

console.log(`Contract compatibility matrix checked: ${matrix.matrixVersion}, ${matrix.rules.length} consumer rules`);
