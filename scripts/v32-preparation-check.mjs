import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const fixturesDir = resolve(root, "packages/contracts/fixtures");
const fixtures = [
  ["v3.2-promotion-eligible-fixture-v1.json", "eligible-fixture", "ELIGIBLE_FOR_REVIEW", "WITHIN_FROZEN_RULES"],
  ["v3.2-promotion-future-data-rejection-v1.json", "future-data-rejected-fixture", "REJECTED", "FUTURE_DATA_LEAKAGE"]
];
for (const [file, scenarioId, disposition, reason] of fixtures) {
  const value = JSON.parse(await readFile(resolve(fixturesDir, file), "utf8"));
  assert.equal(value.schemaVersion, "v3.2-promotion-scenario-v1", `${file} schema version`);
  assert.equal(value.scenarioId, scenarioId, `${file} scenario identity`);
  assert.equal(value.sourceMode, "FIXTURE", `${file} source must be explicit`);
  assert.equal(value.request?.candidateSource, "FIXTURE", `${file} candidate source must be explicit`);
  assert.equal(value.independentValidationExpectation?.disposition, disposition, `${file} disposition`);
  assert.equal(value.independentValidationExpectation?.reason, reason, `${file} reason`);
  assert.equal(value.request?.candidateArtifact?.namespace, `research/${value.request.testRunId}/${value.request.experimentId}/outputs`, `${file} artifact namespace must bind to its run and experiment`);
  assert.equal(Object.hasOwn(value, "approval"), false, `${file} cannot encode human approval`);
  assert.equal(Object.hasOwn(value, "registryState"), false, `${file} cannot encode a Registry transition`);
}
console.log(JSON.stringify({ status: "PASS", scope: "SCHEMA_AND_STATIC_FIXTURE_BINDINGS_ONLY", fixtureCount: fixtures.length, scenarioIds: fixtures.map(([, id]) => id), sourceMode: "FIXTURE", candidateExecution: "NOT_RUN", approval: "NOT_PERFORMED", registryMutation: "NOT_PERFORMED" }));
