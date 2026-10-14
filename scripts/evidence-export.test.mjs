import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { buildEvidenceBundle, decodeV12QlibArtifact, decodeV14Report, decodeV31Artifact, decodeV33Artifact, evidenceRequest, parseEvidenceExportArgs, qlibArtifactPath, serializeEvidence, v12QlibArtifactPath, v14ReportArtifactPath, v31ArtifactPath, v31ArtifactRefs, v33ArtifactRefs } from "./evidence-export-core.mjs";

const promotionRequestId = "6e534a1a-1c8d-4cf1-955c-f1070ac3c424";
const testRunId = "8b2d68d1-62eb-46a8-a2c6-957a7b252a8f";

test("V3.2 export accepts a scoped TestRun or PromotionRequest UUID and rejects unsafe identifiers", () => {
  assert.deepEqual(parseEvidenceExportArgs(["--stage", "V3.2", "--promotion-request", promotionRequestId]), { stage: "V3.2", promotionRequestId });
  assert.deepEqual(parseEvidenceExportArgs(["--stage", "V3.2", "--run", testRunId]), { stage: "V3.2", runId: testRunId });
  assert.throws(() => parseEvidenceExportArgs(["--stage", "V3.2", "--run", "../../tmp/overwrite"]), /TestRun UUID/u);
  assert.throws(() => parseEvidenceExportArgs(["--stage", "V3.2", "--promotion-request", "../escape"]), /UUID/u);
  assert.throws(() => parseEvidenceExportArgs(["--stage", "V3.2", "--run", testRunId, "--promotion-request", promotionRequestId]), /choose exactly one/u);
});

test("V3.3 export binds a passing scenario to its exact TestRun and independently verified output refs", () => {
  const refs = [1, 2].map((roundIndex) => { const bytes = Buffer.from(JSON.stringify({ fixtureId: "v3.1-research-small-sample-1", bars: 6, qlibVersion: "0.9.6.99", return: 0.12 })); const sha256 = createHash("sha256").update(bytes).digest("hex"); return { roundIndex, bytes, ref: { artifactId: `output-round-${roundIndex}-${sha256.slice(0, 16)}`, sha256, namespace: `research/${testRunId}/experiment-1/outputs`, kind: "OUTPUT", status: "PUBLISHED" } }; });
  const responseBody = { testRunId, stageId: "V3.3", scenarioId: "normal", scenarioVersion: "v3.3-readiness-v1", status: "RUNNING", assertions: [{ id: "V3.3_NORMAL_RESULTS_001", status: "PASS" }], evidence: { workflowStep: "NORMAL_ASSERTION_VERIFIED", businessValidation: "PASS", humanAcceptance: "NOT_RUN", experiment: { experimentId: "experiment-1" }, completedRounds: refs.map(({ roundIndex, ref }) => ({ roundIndex, artifacts: [ref] })), normalAssertion: { result: "PASS", outputs: refs.map(({ roundIndex, ref }) => ({ roundIndex, artifactId: ref.artifactId, sha256: ref.sha256, valid: true })) } } };
  const selection = parseEvidenceExportArgs(["--stage", "V3.3", "--run", testRunId]);
  assert.deepEqual(selection, { stage: "V3.3", runId: testRunId });
  const request = evidenceRequest({ ...selection, baseUrl: "http://127.0.0.1:3000", sessionCookie: "sq_session=local-owner" });
  assert.equal(request.url, `http://127.0.0.1:3000/api/v1/acceptance/v3/v3.3/runs/${testRunId}`);
  assert.equal(request.outputDirectory, `evidence/local/V3.3/${testRunId}`);
  const bundle = buildEvidenceBundle({ ...selection, responseBody });
  assert.equal(bundle.businessValidation, "PASS");
  assert.equal(bundle.humanAcceptance, "NOT_RUN");
  const artifacts = v33ArtifactRefs(bundle);
  assert.deepEqual(artifacts.map((item) => item.roundIndex), [1, 2]);
  assert.equal(decodeV33Artifact(bundle, artifacts[0], { ref: { ...refs[0].ref }, contentBase64: refs[0].bytes.toString("base64") }).toString(), refs[0].bytes.toString());
  assert.throws(() => buildEvidenceBundle({ ...selection, responseBody: { ...responseBody, evidence: { ...responseBody.evidence, businessValidation: "NOT_RUN" } } }), /passing scenario assertion/u);
  assert.throws(() => decodeV33Artifact(bundle, artifacts[0], { ref: { ...refs[0].ref, artifactId: "0".repeat(64) }, contentBase64: refs[0].bytes.toString("base64") }), /response identity/u);
  assert.throws(() => parseEvidenceExportArgs(["--stage", "V3.3", "--run", "../../outside"]), /UUID/u);
});

test("V3.2 TestRun export uses owner session, exact run route, and readiness-scoped output", () => {
  const request = evidenceRequest({ stage: "V3.2", runId: testRunId, baseUrl: "http://127.0.0.1:3000", sessionCookie: "sq_session=local-owner" });
  assert.equal(request.url, `http://127.0.0.1:3000/api/v1/acceptance/v3/v3.2/runs/${testRunId}`);
  assert.deepEqual(request.headers, { cookie: "sq_session=local-owner" });
  assert.equal(request.outputDirectory, `evidence/local/V3.2/${testRunId}`);
});

test("V3.2 TestRun export preserves WAITING and rejects non-readiness or altered run responses", () => {
  const responseBody = { testRunId, stageId: "V3.2", scenarioId: "normal", scenarioVersion: "v3.2-readiness-v1", status: "WAITING", assertions: [{ id: "candidate", status: "NOT_RUN" }], evidence: { sourceMode: "READINESS_ONLY", businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" } };
  const bundle = buildEvidenceBundle({ stage: "V3.2", runId: testRunId, responseBody });
  assert.equal(bundle.testRunId, testRunId);
  assert.equal(bundle.status, "WAITING");
  assert.equal(bundle.humanAcceptance, "NOT_RUN");
  assert.throws(() => buildEvidenceBundle({ stage: "V3.2", runId: testRunId, responseBody: { ...responseBody, testRunId: promotionRequestId } }), /not bound/u);
  assert.throws(() => buildEvidenceBundle({ stage: "V3.2", runId: testRunId, responseBody: { ...responseBody, status: "PASS" } }), /READINESS_ONLY/u);
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

test("V1 stage exports are stored under the stage-scoped version-gate directory", () => {
  for (const stage of ["V1.1", "V1.2", "V1.5"]) {
    const request = evidenceRequest({ stage, runId: testRunId, baseUrl: "http://127.0.0.1:3000", sessionCookie: "sq_session=local-owner" });
    assert.equal(request.outputDirectory, `evidence/local/${stage}/${testRunId}`);
  }
});

test("V1 evidence envelope binds top-level stage and run identity while preserving NOT_RUN acceptance", () => {
  const responseBody = {
    evidenceVersion: "v2-stage-run-1",
    run: { stageId: "V1.2", testRunId, status: "COMPLETED", assertions: [{ status: "PASS" }] },
    assertions: [{ status: "PASS" }],
    manualConclusion: "NOT_RUN",
  };
  const bundle = buildEvidenceBundle({ stage: "V1.2", runId: testRunId, responseBody });
  assert.equal(bundle.stageId, "V1.2");
  assert.equal(bundle.testRunId, testRunId);
  assert.equal(bundle.run.testRunId, testRunId);
  assert.equal(bundle.manualConclusion, "NOT_RUN");
  assert.throws(() => buildEvidenceBundle({ stage: "V1.2", runId: testRunId, responseBody: { ...responseBody, run: { ...responseBody.run, testRunId: promotionRequestId } } }), /not bound/u);
});

test("V1.2 export binds the owner-scoped Qlib bytes to the persisted common ArtifactRef", () => {
  const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}` : JSON.stringify(value);
  const payload = { schemaVersion: "v1.2-qlib-strategy-artifact-v1", predictionCount: 1, predictions: [0.25] };
  const sha256 = createHash("sha256").update(canonical(payload)).digest("hex");
  const artifactRef = { schemaVersion: "artifact-ref.v1", artifactId: sha256, testRunId, ownerId: "local-owner", kind: "MODEL_PREDICTIONS", namespace: `research/${testRunId}/qlib-fixture`, mediaType: "application/vnd.stockquant.qlib-fixture-model+json", sha256, status: "PUBLISHED", sourceRef: `platform-api-service:v1.2:${testRunId}` };
  const responseBody = { testRunId, stageId: "V1.2", ownerId: "local-owner", status: "COMPLETED", evidence: { qlibFit: { artifactRef, artifactUrl: `/api/v1/acceptance/v1/v1.2/runs/${testRunId}/artifacts/${sha256}` } } };
  const selection = { stage: "V1.2", runId: testRunId };
  assert.equal(evidenceRequest({ ...selection, baseUrl: "http://127.0.0.1:3000", sessionCookie: "sq_session=local-owner" }).url, `http://127.0.0.1:3000/api/v1/acceptance/v1/v1.2/runs/${testRunId}`);
  const bundle = buildEvidenceBundle({ ...selection, responseBody });
  assert.equal(v12QlibArtifactPath(bundle, "http://127.0.0.1:3000"), `http://127.0.0.1:3000/api/v1/acceptance/v1/v1.2/runs/${testRunId}/artifacts/${sha256}`);
  const bytes = decodeV12QlibArtifact(bundle, { artifactRef, payload });
  assert.equal(bytes.toString(), canonical(payload));
  assert.throws(() => decodeV12QlibArtifact(bundle, { artifactRef, payload: { ...payload, predictions: [0.5] } }), /content hash/u);
  assert.throws(() => v12QlibArtifactPath({ ...bundle, evidence: { qlibFit: { ...bundle.evidence.qlibFit, artifactRef: { ...artifactRef, ownerId: "other" } } } }, "https://attacker.invalid"), /TestRun and owner/u);
});

test("V1.2 export permits a valid TestRun with no Qlib ArtifactRef", () => {
  const bundle = buildEvidenceBundle({
    stage: "V1.2",
    runId: testRunId,
    responseBody: { testRunId, stageId: "V1.2", ownerId: "local-owner", status: "REJECTED", evidence: { qlibFit: null } },
  });
  assert.equal(v12QlibArtifactPath(bundle, "http://127.0.0.1:3000"), null);
});

test("V1.4 export downloads only the owner-scoped completed report and verifies its canonical hash", () => {
  const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}` : JSON.stringify(value);
  const content = { testRunId, status: "COMPLETED", assertions: [{ assertionId: "daily", status: "PASS" }] };
  const sha256 = createHash("sha256").update(canonical(content)).digest("hex");
  const artifactRef = { schemaVersion: "artifact-ref.v1", artifactId: sha256, testRunId, ownerId: "local-owner", kind: "BACKTEST_REPORT", namespace: `research/${testRunId}/daily-backtest`, sha256, status: "PUBLISHED", sourceRef: `quant-research-service:v1.4:${testRunId}` };
  const responseBody = { testRunId, stageId: "V1.4", ownerId: "local-owner", status: "COMPLETED", artifactRefs: [artifactRef] };
  assert.equal(evidenceRequest({ stage: "V1.4", runId: testRunId, baseUrl: "http://127.0.0.1:3000", sessionCookie: "sq_session=local-owner" }).url, `http://127.0.0.1:3000/api/v1/acceptance/v1/v1.4/runs/${testRunId}`);
  const bundle = buildEvidenceBundle({ stage: "V1.4", runId: testRunId, responseBody });
  assert.equal(v14ReportArtifactPath(bundle, "http://127.0.0.1:3000"), `http://127.0.0.1:3000/api/v1/acceptance/v1/v1.4/runs/${testRunId}/artifacts/${sha256}`);
  const bytes = decodeV14Report(bundle, { artifactRef, content });
  assert.equal(bytes.toString(), canonical(content));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), sha256);
  assert.throws(() => decodeV14Report(bundle, { artifactRef, content: { ...content, status: "FAILED" } }), /identity or content hash/u);
  assert.throws(() => v14ReportArtifactPath({ ...bundle, artifactRefs: [{ ...artifactRef, ownerId: "other" }] }, "https://attacker.invalid"), /owner scope/u);
});

test("V2.3 export binds TestRun and only permits its owner-scoped content-addressed artifact route", () => {
  const artifactId = "a".repeat(64);
  const request = evidenceRequest({ stage: "V2.3", runId: testRunId, baseUrl: "http://127.0.0.1:3000", sessionCookie: "sq_session=local-owner" });
  assert.equal(request.url, `http://127.0.0.1:3000/api/v1/acceptance/v2/v2.3/runs/${testRunId}`);
  const qlibRef = { artifactId, sha256: artifactId, mediaType: "application/vnd.stockquant.qlib-fixture-model+json", url: `/api/v1/acceptance/v2/v2.3/runs/${testRunId}/artifacts/${artifactId}` };
  const commonRef = { schemaVersion: "artifact-ref.v1", artifactId, testRunId, ownerId: "local-owner", kind: "MODEL_PREDICTIONS", namespace: `research/${testRunId}/qlib-fixture`, mediaType: qlibRef.mediaType, sha256: artifactId, status: "PUBLISHED", sourceRef: `platform-api-service:v2.3:${testRunId}` };
  const body = { testRunId, stageId: "V2.3", ownerId: "local-owner", status: "COMPLETED", artifactRefs: [commonRef], evidence: { crossService: { research: { durableArtifactStatus: "PERSISTED", artifactRef: qlibRef } } } };
  const bundle = buildEvidenceBundle({ stage: "V2.3", runId: testRunId, responseBody: body });
  assert.equal(qlibArtifactPath(bundle, "http://127.0.0.1:3000"), `http://127.0.0.1:3000/api/v1/acceptance/v2/v2.3/runs/${testRunId}/artifacts/${artifactId}`);
  const tampered = { ...bundle, evidence: { crossService: { research: { artifactRef: { ...body.evidence.crossService.research.artifactRef, url: "https://evil.invalid/steal" } } } } };
  assert.throws(() => qlibArtifactPath(tampered, "http://127.0.0.1:3000"), /does not match/u);
  assert.throws(() => qlibArtifactPath({ ...bundle, artifactRefs: [{ ...commonRef, ownerId: "other-owner" }] }, "http://127.0.0.1:3000"), /canonical/u);
  assert.throws(() => buildEvidenceBundle({ stage: "V2.3", runId: testRunId, responseBody: { ...body, stageId: "V2.4" } }), /not bound/u);
  const bytes = Buffer.from("artifact");
  const output = serializeEvidence(bundle, [{ filename: "qlib-fixture-artifact.json", bytes }]);
  assert.match(output.manifest, new RegExp(`${createHash("sha256").update(bytes).digest("hex")}  qlib-fixture-artifact\\.json\\n`, "u"));
  assert.equal(output.attachments[0].bytes.toString(), "artifact");
});

test("V3.1 export requires an exact TestRun and only downloads its published input/output refs", () => {
  const inputBytes = Buffer.from("fixture-input");
  const outputBytes = Buffer.from("fixture-output");
  const ref = (bytes, kind, namespace) => ({ schemaVersion: "v3.1-artifact-ref-v1", artifactId: createHash("sha256").update(bytes).digest("hex"), kind, namespace, sha256: createHash("sha256").update(bytes).digest("hex"), status: "PUBLISHED", sourceRef: "artifact://local" });
  const input = ref(inputBytes, "INPUT", `research/${testRunId}/experiment-1/inputs`);
  const output = ref(outputBytes, "OUTPUT", `research/${testRunId}/experiment-1/outputs`);
  const ownerId = "owner-1";
  const common = (value) => ({ schemaVersion: "artifact-ref.v1", artifactId: value.artifactId, testRunId, ownerId, kind: value.kind, namespace: value.namespace, sha256: value.sha256, status: value.status, sourceRef: value.sourceRef });
  const responseBody = { testRunId, stageId: "V3.1", ownerId, scenarioId: "fixed-pipeline", artifactRefs: [common(input), common(output)], evidence: { orchestration: { inputRef: input, runnerJob: { jobId: `${testRunId}:experiment-1`, job: { testRunId, experimentId: "experiment-1", outputNamespace: output.namespace }, artifacts: [output] } } } };
  const request = evidenceRequest({ stage: "V3.1", runId: testRunId, baseUrl: "http://127.0.0.1:3000", sessionCookie: "sq_session=local-owner" });
  assert.equal(request.url, `http://127.0.0.1:3000/api/v1/acceptance/v3/v3.1/runs/${testRunId}`);
  assert.equal(request.outputDirectory, `evidence/local/V3.1/${testRunId}`);
  const bundle = buildEvidenceBundle({ stage: "V3.1", runId: testRunId, responseBody });
  assert.deepEqual(v31ArtifactRefs(bundle).map(({ kind }) => kind), ["INPUT", "OUTPUT"]);
  assert.equal(v31ArtifactPath(bundle, output, "http://127.0.0.1:3000"), `http://127.0.0.1:3000/api/v1/acceptance/v3/v3.1/runs/${testRunId}/artifacts/${output.artifactId}`);
  assert.equal(decodeV31Artifact(input, { ref: input, contentBase64: inputBytes.toString("base64") }).toString(), "fixture-input");
  assert.throws(() => decodeV31Artifact(input, { ref: input, contentBase64: outputBytes.toString("base64") }), /content hash/u);
  assert.throws(() => v31ArtifactPath(bundle, { ...output, namespace: "research/other/experiment-1/outputs" }, "https://attacker.invalid"), /not associated/u);
  assert.throws(() => buildEvidenceBundle({ stage: "V3.1", runId: testRunId, responseBody: { ...responseBody, stageId: "V3.2" } }), /not bound/u);
  assert.throws(() => v31ArtifactRefs({ ...bundle, artifactRefs: [{ ...common(output), sha256: "0".repeat(64) }, common(input)] }), /does not match/u);
  assert.throws(() => v31ArtifactRefs({ ...bundle, evidence: { orchestration: { ...responseBody.evidence.orchestration, inputRef: { ...input, namespace: "research/other/experiment-1/inputs" } } } }), /namespace/u);
});
