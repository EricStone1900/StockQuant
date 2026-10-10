import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

test("generated TypeScript keeps oneOf readiness gates as discriminated unions", async () => {
  const generated = await readFile(resolve("packages/contracts/generated/types.ts"), "utf8");
  const readiness = generated.match(/export type V24PaperReadiness = \{[\s\S]*?(?=\n\nexport type V24PaperStageRunAccepted)/u)?.[0];
  assert.ok(readiness, "V24PaperReadiness type must be generated");
  assert.match(readiness, /"policyReadiness": \{[\s\S]*?"status": 'BLOCKED'[\s\S]*?\}\s*\|\s*\{[\s\S]*?"status": 'REJECTED'/u);
  assert.match(readiness, /"mandateReadiness": \{[\s\S]*?"status": 'BLOCKED'[\s\S]*?\}\s*\|\s*\{[\s\S]*?"status": 'REJECTED'/u);
  assert.doesNotMatch(readiness, /"(?:policyReadiness|mandateReadiness)": unknown/u);
});

test("TypeScript and Python expose every field in the shared V1 account, money, security, clock and TestRun contracts", async () => {
  const [typescript, python] = await Promise.all([
    readFile(resolve("packages/contracts/generated/types.ts"), "utf8"),
    readFile(resolve("packages/contracts/generated/types.py"), "utf8"),
  ]);
  const coreSchemas = [
    ["money.schema.json", "Money"],
    ["security.schema.json", "Security"],
    ["account-initialization.schema.json", "AccountInitializationFixture"],
    ["account-snapshot.schema.json", "AccountSnapshot"],
    ["clock-context.schema.json", "ClockContext"],
    ["test-run.schema.json", "TestRun"],
  ];

  const findTypeBlock = (source, language, typeName) => {
    const marker = language === "typescript" ? `export type ${typeName} =` : `${typeName} = TypedDict(`;
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, `${language} output must define ${typeName}`);
    const next = language === "typescript" ? source.indexOf("\n\nexport type ", start + marker.length) : source.indexOf("\n\n", start + marker.length);
    return source.slice(start, next === -1 ? undefined : next);
  };

  for (const [schemaFile, typeName] of coreSchemas) {
    const schema = JSON.parse(await readFile(resolve("packages/contracts/schemas/common", schemaFile), "utf8"));
    for (const [language, source] of [["typescript", typescript], ["python", python]]) {
      const block = findTypeBlock(source, language, typeName);
      for (const field of Object.keys(schema.properties)) {
        assert.ok(block.includes(`"${field}"`), `${language} ${typeName} must expose schema property ${field}`);
      }
      for (const field of schema.required ?? []) {
        const requiredMarker = language === "typescript" ? `"${field}":` : `"${field}": Required[`;
        assert.ok(block.includes(requiredMarker), `${language} ${typeName}.${field} must remain required`);
      }
    }
  }
});

test("every service TypeScript contract copy preserves the shared V1 core schema fields and requiredness", async () => {
  const servicesRoot = resolve("services");
  const services = (await readdir(servicesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const generatedContracts = await Promise.all(services.map(async (service) => {
    const path = join(servicesRoot, service, "src/contracts/generated-types.ts");
    try {
      return { service, path, source: await readFile(path, "utf8") };
    } catch (error) {
      if (error?.code === "ENOENT") return undefined;
      throw error;
    }
  }));
  const consumers = generatedContracts.filter(Boolean);
  assert.equal(consumers.length, 8, "all eight domain services must have a generated contract copy");

  const coreSchemas = [
    ["money.schema.json", "Money"],
    ["security.schema.json", "Security"],
    ["account-initialization.schema.json", "AccountInitializationFixture"],
    ["account-snapshot.schema.json", "AccountSnapshot"],
    ["clock-context.schema.json", "ClockContext"],
    ["test-run.schema.json", "TestRun"],
  ];
  for (const [schemaFile, typeName] of coreSchemas) {
    const schema = JSON.parse(await readFile(resolve("packages/contracts/schemas/common", schemaFile), "utf8"));
    for (const { service, path, source } of consumers) {
      const start = source.indexOf(`export type ${typeName} =`);
      assert.notEqual(start, -1, `${service} must expose ${typeName} in ${path}`);
      const next = source.indexOf("\n\nexport type ", start + 1);
      const block = source.slice(start, next === -1 ? undefined : next);
      for (const field of Object.keys(schema.properties)) {
        assert.ok(block.includes(`"${field}"`), `${service} ${typeName} must expose schema property ${field}`);
      }
      for (const field of schema.required ?? []) {
        assert.ok(block.includes(`"${field}":`), `${service} ${typeName}.${field} must remain required`);
        assert.doesNotMatch(block, new RegExp(`"${field}"\\?:`), `${service} ${typeName}.${field} must not become optional`);
      }
    }
  }
});
