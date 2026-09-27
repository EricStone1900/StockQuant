import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEvidenceBundle, evidenceRequest, parseEvidenceExportArgs, serializeEvidence } from "./evidence-export-core.mjs";

const promotionRequestId = "6e534a1a-1c8d-4cf1-955c-f1070ac3c424";
const testRunId = "8b2d68d1-62eb-46a8-a2c6-957a7b252a8f";

test("V3.2 export requires a PromotionRequest id and rejects TestRun-shaped arguments", () => {
  assert.deepEqual(parseEvidenceExportArgs(["--stage", "V3.2", "--promotion-request", promotionRequestId]), { stage: "V3.2", promotionRequestId });
  assert.throws(() => parseEvidenceExportArgs(["--stage", "V3.2", "--run", testRunId]), /does not export a V3.2 TestRun/u);
  assert.throws(() => parseEvidenceExportArgs(["--stage", "V3.2", "--promotion-request", "../escape"]), /UUID/u);
  assert.throws(() => parseEvidenceExportArgs(["--stage", "V3.2", "--run", testRunId, "--promotion-request", promotionRequestId]), /choose exactly one/u);
});

test("V3.2 export uses owner session cookie, scoped route, and non-overwriting local output", () => {
  const request = evidenceRequest({ stage: "V3.2", promotionRequestId, baseUrl: "http://127.0.0.1:3000", sessionCookie: "sq_session=local-owner" });
  assert.equal(request.url, `http://127.0.0.1:3000/api/v1/acceptance/v3/v3.2/promotions/${promotionRequestId}`);
  assert.deepEqual(request.headers, { cookie: "sq_session=local-owner" });
  assert.equal(request.outputDirectory, `evidence/local/V3.2/${promotionRequestId}`);
  assert.throws(() => evidenceRequest({ stage: "V3.2", promotionRequestId, baseUrl: "http://localhost", sessionCookie: "" }), /SESSION_COOKIE/u);
  assert.throws(() => evidenceRequest({ stage: "V3.2", promotionRequestId, baseUrl: "http://localhost", sessionCookie: undefined }), /SESSION_COOKIE/u);
  assert.throws(() => evidenceRequest({ stage: "V3.2", promotionRequestId, baseUrl: "http://localhost", sessionCookie: "sq_session=x\r\nAuthorization: Bearer leaked" }), /SESSION_COOKIE/u);
});

test("V3.2 snapshot requires exact PromotionRequest/TestRun binding and labels acceptance NOT_RUN", () => {
  const responseBody = {
    request: { request: { promotionRequestId, testRunId } },
    validationReport: null,
    registryMutation: "NOT_PERFORMED",
    activation: "DISABLED_UNTIL_MANDATE",
    testRunId,
  };
  const bundle = buildEvidenceBundle({ stage: "V3.2", promotionRequestId, responseBody });
  assert.equal(bundle.sourceTestRunId, testRunId);
  assert.equal(bundle.businessValidation, "NOT_RUN");
  assert.equal(bundle.humanAcceptance, "NOT_RUN");
  assert.throws(() => buildEvidenceBundle({ stage: "V3.2", promotionRequestId, responseBody: { ...responseBody, testRunId: promotionRequestId } }), /not bound/u);
  assert.throws(() => buildEvidenceBundle({ stage: "V3.2", promotionRequestId, responseBody: { ...responseBody, activation: undefined } }), /boundary facts/u);
});

test("manifest digest covers the exact serialized JSON bytes", () => {
  const bundle = buildEvidenceBundle({ stage: "V3.2", promotionRequestId, responseBody: { request: { request: { promotionRequestId, testRunId } }, validationReport: null, registryMutation: "NOT_PERFORMED", activation: "DISABLED_UNTIL_MANDATE", testRunId } });
  const output = serializeEvidence(bundle);
  assert.match(output.manifest, new RegExp(`^${output.manifestHash}  evidence\\.json\\n$`, "u"));
  assert.equal(JSON.parse(output.serialized).humanAcceptance, "NOT_RUN");
});

test("existing run export keeps its route but rejects filesystem traversal ids", () => {
  assert.deepEqual(parseEvidenceExportArgs(["--stage", "V2.2", "--run", testRunId]), { stage: "V2.2", runId: testRunId });
  assert.throws(() => parseEvidenceExportArgs(["--run", "../../tmp/overwrite"]), /safe run identifier/u);
  const request = evidenceRequest({ stage: "V2.2", runId: testRunId, baseUrl: "http://127.0.0.1:3000", sessionCookie: "sq_session=local-owner" });
  assert.equal(request.url, `http://127.0.0.1:3000/api/v1/acceptance/v2/v2.2/runs/${testRunId}`);
});
