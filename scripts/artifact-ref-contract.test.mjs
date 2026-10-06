import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { test } from "node:test";

const artifactSchema = JSON.parse(await readFile(new URL("../packages/contracts/schemas/common/artifact-ref.schema.json", import.meta.url), "utf8"));
const clockSchema = JSON.parse(await readFile(new URL("../packages/contracts/schemas/common/clock-context.schema.json", import.meta.url), "utf8"));
const testRunSchema = JSON.parse(await readFile(new URL("../packages/contracts/schemas/common/test-run.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(artifactSchema);
ajv.addSchema(clockSchema);
const validateRun = ajv.compile(testRunSchema);

const ref = {
  schemaVersion: "artifact-ref.v1",
  artifactId: "sha256:content-address-or-store-id",
  testRunId: "8b2d68d1-62eb-46a8-a2c6-957a7b252a8f",
  ownerId: "owner-1",
  kind: "INPUT",
  namespace: "research/8b2d68d1-62eb-46a8-a2c6-957a7b252a8f/exp-1/inputs",
  mediaType: "application/octet-stream",
  byteLength: 17,
  sha256: "a".repeat(64),
  status: "PUBLISHED",
  sourceRef: "fixture://small-sample-v1",
  createdAt: "2026-10-01T00:00:00.000Z",
  expiresAt: null,
};

test("TestRun artifactRefs validate against the shared immutable ArtifactRef schema", () => {
  const run = {
    testRunId: ref.testRunId,
    stageId: "V3.1",
    scenarioId: "normal",
    scenarioVersion: "1.0.0",
    namespace: `run-${ref.testRunId}`,
    ownerId: ref.ownerId,
    environmentMode: "BACKTEST",
    brokerMode: "FAKE",
    dataMode: "FIXTURE",
    clock: { clockMode: "FIXED", asOf: "2026-10-01T00:00:00.000Z", runId: ref.testRunId },
    status: "COMPLETED",
    seed: 20260907,
    createdAt: "2026-10-01T00:00:00.000Z",
    artifactRefs: [ref],
  };
  assert.equal(validateRun(run), true, JSON.stringify(validateRun.errors));
  for (const invalid of [
    { ...ref, sha256: "bad" },
    { ...ref, status: "UNKNOWN" },
    { ...ref, unreviewedField: "must not silently enter evidence" },
    { ...ref, schemaVersion: "v3.1-artifact-ref-v1" },
    (({ ownerId, ...withoutOwner }) => withoutOwner)(ref),
    (({ testRunId, ...withoutRun }) => withoutRun)(ref),
  ]) {
    assert.equal(validateRun({ ...run, artifactRefs: [invalid] }), false);
  }
});
