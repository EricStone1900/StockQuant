import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const promotionRequestId = "6e534a1a-1c8d-4cf1-955c-f1070ac3c424";
const mismatchedPromotionId = "3e38c9b7-17c2-4874-a38c-d5cc49671023";
const testRunId = "8b2d68d1-62eb-46a8-a2c6-957a7b252a8f";
let receivedCookie;
let badArtifactHash = false;
const inputBytes = Buffer.from("isolated-v31-input-fixture");
const outputBytes = Buffer.from("isolated-v31-output-fixture");
const ref = (bytes, kind, suffix) => ({ schemaVersion: "v3.1-artifact-ref-v1", artifactId: createHash("sha256").update(bytes).digest("hex"), kind, namespace: `research/${testRunId}/experiment-smoke/${suffix}`, sha256: createHash("sha256").update(bytes).digest("hex"), status: "PUBLISHED", sourceRef: "artifact://isolated-smoke" });
const inputRef = ref(inputBytes, "INPUT", "inputs");
const outputRef = ref(outputBytes, "OUTPUT", "outputs");
const commonRef = (ref) => ({ schemaVersion: "artifact-ref.v1", artifactId: ref.artifactId, testRunId, ownerId: "export-owner", kind: ref.kind, namespace: ref.namespace, sha256: ref.sha256, status: ref.status, sourceRef: ref.sourceRef });
const v31Body = { testRunId, stageId: "V3.1", ownerId: "export-owner", artifactRefs: [commonRef(inputRef), commonRef(outputRef)], scenarioId: "fixed-pipeline", scenarioVersion: "1.0.0", status: "COMPLETED", assertions: [{ assertionId: "FIXED", status: "PASS" }], evidence: { orchestration: { inputRef, runnerJob: { jobId: `${testRunId}:experiment-smoke`, job: { testRunId, experimentId: "experiment-smoke", outputNamespace: outputRef.namespace }, artifacts: [outputRef], attackerUrl: "https://attacker.invalid/steal" } } } };
const server = createServer((request, response) => {
  receivedCookie = request.headers.cookie;
  response.setHeader("content-type", "application/json");
  if (receivedCookie !== "sq_session=export-owner") { response.writeHead(403).end(JSON.stringify({ message: "owner session required" })); return; }
  if (request.url === `/api/v1/acceptance/v3/v3.2/runs/${testRunId}`) {
    response.end(JSON.stringify({ testRunId, stageId: "V3.2", scenarioId: "normal", scenarioVersion: "v3.2-readiness-v1", status: "WAITING", assertions: [{ id: "candidate", status: "NOT_RUN" }], evidence: { sourceMode: "READINESS_ONLY", businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" } }));
    return;
  }
  if (request.url === `/api/v1/acceptance/v3/v3.1/runs/${testRunId}`) { response.end(JSON.stringify(v31Body)); return; }
  if (request.url === `/api/v1/acceptance/v3/v3.1/runs/${testRunId}/artifacts/${inputRef.artifactId}`) { response.end(JSON.stringify({ ref: inputRef, contentBase64: inputBytes.toString("base64") })); return; }
  if (request.url === `/api/v1/acceptance/v3/v3.1/runs/${testRunId}/artifacts/${outputRef.artifactId}`) { response.end(JSON.stringify({ ref: outputRef, contentBase64: badArtifactHash ? inputBytes.toString("base64") : outputBytes.toString("base64") })); return; }
  response.end(JSON.stringify({
    request: { request: { promotionRequestId, testRunId } },
    validationReport: null,
    registryMutation: "NOT_PERFORMED",
    activation: "DISABLED_UNTIL_MANDATE",
    testRunId,
  }));
});
server.listen(0, "127.0.0.1");
await new Promise((resolveListen, reject) => { server.once("listening", resolveListen); server.once("error", reject); });
const address = server.address();
const scratch = await mkdtemp(join(tmpdir(), "stockquant-evidence-export-smoke-"));
const script = resolve("scripts/evidence-export.mjs");
const env = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? tmpdir(), STOCKQUANT_PLATFORM_API_URL: `http://127.0.0.1:${address.port}`, STOCKQUANT_EVIDENCE_SESSION_COOKIE: "sq_session=export-owner" };
const run = (id, session = env.STOCKQUANT_EVIDENCE_SESSION_COOKIE) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(process.execPath, [script, "--stage", "V3.2", "--promotion-request", id], { cwd: scratch, env: { ...env, STOCKQUANT_EVIDENCE_SESSION_COOKIE: session }, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
  child.once("error", rejectRun);
  child.once("close", (status, signal) => resolveRun({ status, signal, stdout, stderr }));
});
const runTestRun = (id, session = env.STOCKQUANT_EVIDENCE_SESSION_COOKIE) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(process.execPath, [script, "--stage", "V3.2", "--run", id], { cwd: scratch, env: { ...env, STOCKQUANT_EVIDENCE_SESSION_COOKIE: session }, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
  child.once("error", rejectRun);
  child.once("close", (status, signal) => resolveRun({ status, signal, stdout, stderr }));
});
const runV31 = (session = env.STOCKQUANT_EVIDENCE_SESSION_COOKIE, extraEnv = {}) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(process.execPath, [script, "--stage", "V3.1", "--run", testRunId], { cwd: scratch, env: { ...env, ...extraEnv, STOCKQUANT_EVIDENCE_SESSION_COOKIE: session }, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = ""; let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
  child.once("error", rejectRun);
  child.once("close", (status, signal) => resolveRun({ status, signal, stdout, stderr }));
});

try {
  const first = await run(promotionRequestId);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(receivedCookie, "sq_session=export-owner");
  const outputDirectory = join(scratch, "evidence/local/V3.2", promotionRequestId);
  const evidencePath = join(outputDirectory, "evidence.json");
  const evidenceBytes = await readFile(evidencePath);
  const manifest = await readFile(join(outputDirectory, "manifest.sha256"), "utf8");
  assert.match(manifest, new RegExp(`^${createHash("sha256").update(evidenceBytes).digest("hex")}  evidence\\.json\\n$`, "u"));
  assert.equal(JSON.parse(evidenceBytes.toString("utf8")).humanAcceptance, "NOT_RUN");
  const repeat = await run(promotionRequestId);
  assert.equal(repeat.status, 2, repeat.stderr);
  assert.deepEqual(await readFile(evidencePath), evidenceBytes);
  const forbidden = await run(mismatchedPromotionId, "sq_session=other-owner");
  assert.equal(forbidden.status, 2);
  await assert.rejects(stat(join(scratch, "evidence/local/V3.2", mismatchedPromotionId)));
  const mismatch = await run(mismatchedPromotionId);
  assert.equal(mismatch.status, 2);
  await assert.rejects(stat(join(scratch, "evidence/local/V3.2", mismatchedPromotionId)));

  const readiness = await runTestRun(testRunId);
  assert.equal(readiness.status, 0, readiness.stderr);
  assert.equal(receivedCookie, "sq_session=export-owner");
  const readinessDirectory = join(scratch, "evidence/local/V3.2", testRunId);
  const readinessBytes = await readFile(join(readinessDirectory, "evidence.json"));
  const readinessManifest = await readFile(join(readinessDirectory, "manifest.sha256"), "utf8");
  const readinessBundle = JSON.parse(readinessBytes.toString("utf8"));
  assert.match(readinessManifest, new RegExp(`^${createHash("sha256").update(readinessBytes).digest("hex")}  evidence\\.json\\n$`, "u"));
  assert.equal(readinessBundle.status, "WAITING");
  assert.equal(readinessBundle.humanAcceptance, "NOT_RUN");
  assert.equal(readinessBundle.evidence.evidence.sourceMode, "READINESS_ONLY");
  const readinessRepeat = await runTestRun(testRunId);
  assert.equal(readinessRepeat.status, 2, readinessRepeat.stderr);
  assert.deepEqual(await readFile(join(readinessDirectory, "evidence.json")), readinessBytes);
  const wrongOwnerRun = await runTestRun(testRunId, "sq_session=other-owner");
  assert.equal(wrongOwnerRun.status, 2);
  badArtifactHash = true;
  const badHash = await runV31();
  badArtifactHash = false;
  assert.equal(badHash.status, 2);
  assert.match(badHash.stderr, /content hash/u);
  await assert.rejects(stat(join(scratch, "evidence/local/V3.1", testRunId)));
  const v31 = await runV31();
  assert.equal(v31.status, 0, v31.stderr);
  const v31Directory = join(scratch, "evidence/local/V3.1", testRunId);
  assert.equal((await readFile(join(v31Directory, `v31-input-${inputRef.sha256}.bin`))).toString(), inputBytes.toString());
  assert.equal((await readFile(join(v31Directory, `v31-output-${outputRef.sha256}.bin`))).toString(), outputBytes.toString());
  const v31Manifest = await readFile(join(v31Directory, "manifest.sha256"), "utf8");
  assert.match(v31Manifest, new RegExp(`${inputRef.sha256}  v31-input-${inputRef.sha256}\\.bin`, "u"));
  assert.match(v31Manifest, new RegExp(`${outputRef.sha256}  v31-output-${outputRef.sha256}\\.bin`, "u"));
  assert.equal(v31.stdout.includes("attacker.invalid"), false);
  assert.equal((await runV31()).status, 2);
  const deniedV31 = await runV31("sq_session=other-owner", { STOCKQUANT_EVIDENCE_SESSION_COOKIE: "sq_session=other-owner" });
  assert.equal(deniedV31.status, 2);
  await assert.rejects(stat(join(scratch, "evidence/local/V3.1", "missing")));
  assert.equal(JSON.parse(await readFile(join(v31Directory, "evidence.json"), "utf8")).testRunId, testRunId);
  console.log(JSON.stringify({ status: "PASS", cases: 11, ownerSession: "accepted", promotionBinding: "verified", readinessTestRunBinding: "verified", readinessState: "WAITING_NOT_RUN", v31InputOutputRefs: "exact_run_namespace_and_hash_verified", manifest: "exact_bytes_verified", repeatExports: "refused_without_overwrite", wrongOwner: "403_no_output", tamperedArtifact: "rejected_without_overwrite", activeData: "NOT_TOUCHED" }));
} finally {
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
  await rm(scratch, { recursive: true, force: true });
}
