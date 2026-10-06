import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { test } from "node:test";

const readSchema = async (name) => JSON.parse(await readFile(new URL(`../packages/contracts/research/${name}`, import.meta.url), "utf8"));
const requestSchema = await readSchema("v3.2-promotion-request.schema.json");
const resultSchema = await readSchema("v3.2-promotion-prepare-result.schema.json");
const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(requestSchema);
const validate = ajv.compile(resultSchema);

const request = {
  schemaVersion: "v3.2-promotion-request-v1",
  promotionRequestId: "efbfdd83-df82-44c1-b731-f4f50f11e6bb",
  testRunId: "4f3d6887-a22b-4846-8e52-1733712c75e1",
  experimentId: "19ec136b-f14b-48b4-9235-7bf2ed52de81",
  candidateSource: "FIXTURE",
  candidateArtifact: { artifactId: "candidate-1", namespace: "research/run-1/exp-1/outputs", sha256: "a".repeat(64) },
  codeSha256: "b".repeat(64),
  dataManifestSha256: "c".repeat(64),
  metricsManifestSha256: "d".repeat(64),
  validationPlanSha256: "e".repeat(64),
  budget: { allocationId: "budget-1", currency: "USD", reservedMinor: 100, consumedMinor: 80 },
  idempotencyKey: "v32-prepare-replay-key",
};

test("Promotion preparation contract distinguishes WAITING from gate-ready evidence", () => {
  assert.equal(validate({ status: "WAITING", blockers: ["Runner Job is RUNNING, not COMPLETED"], promotionRequest: null }), true);
  assert.equal(validate({ status: "READY_FOR_GATE_CHECK", blockers: [], promotionRequest: request }), true);
  for (const invalid of [
    { status: "WAITING", blockers: [], promotionRequest: request },
    { status: "READY_FOR_GATE_CHECK", blockers: ["unexpected blocker"], promotionRequest: request },
    { status: "READY_FOR_GATE_CHECK", blockers: [], promotionRequest: null },
    { status: "UNKNOWN", blockers: [], promotionRequest: null },
    { status: "WAITING", blockers: [], promotionRequest: null, approvedBy: "user" },
  ]) assert.equal(validate(invalid), false, JSON.stringify(invalid));
});
