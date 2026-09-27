import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseValidationSubmission } from "../dist/validation-submission.js";
import { verifyV32SyntheticFixture } from "../dist/v32-independent-recompute.js";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fixtureDir = resolve(root, "fixtures/v3/v3.2-independent-validation-v1");
const evaluator = resolve(root, "services/quant-research-service/scripts/v32-independent-validation-evaluator.mjs");
const candidateRunner = resolve(root, "services/quant-research-service/scripts/v32-candidate-signal-runner.py");
const distDir = resolve(root, "services/quant-research-service/dist");
const base = process.env.STOCKQUANT_QUANT_RESEARCH_URL?.replace(/\/$/, "");
const token = process.env.STOCKQUANT_SERVICE_TOKEN_QUANT_VALIDATION_WORKER;
const researchAutomationBase = process.env.STOCKQUANT_RESEARCH_AUTOMATION_URL?.replace(/\/$/, "");
const promotionRequestId = process.argv[2];
const imageId = process.env.STOCKQUANT_V32_VALIDATION_IMAGE_ID ?? "sha256:ce165dcca6608664c518ae71c86ed3fce33da1d1e88b5dee2504fc0cbff55beb";
const candidateImageId = "sha256:829cc065f506a60d332260af9fc48c590d60cfeff8bfc20df57b7baf20edb879";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (!base || !researchAutomationBase || !token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(promotionRequestId ?? "")) throw new Error("usage: STOCKQUANT_QUANT_RESEARCH_URL=... STOCKQUANT_RESEARCH_AUTOMATION_URL=... STOCKQUANT_SERVICE_TOKEN_QUANT_VALIDATION_WORKER=... node scripts/v32-independent-validation-worker.mjs <PromotionRequest UUID>");
if (!/^sha256:[a-f0-9]{64}$/u.test(imageId)) throw new Error("validation executor must be pinned by immutable image ID");

const inspect = spawnSync("docker", ["image", "inspect", "--format", "{{.Id}} {{.Os}}/{{.Architecture}}", imageId], { encoding: "utf8", timeout: 10_000, maxBuffer: 10_000 });
if (inspect.error || inspect.status !== 0) throw new Error(`pinned validation image is unavailable: ${inspect.stderr || inspect.error?.message || "docker inspect failed"}`);
const [resolvedImageId, platform] = inspect.stdout.trim().split(/\s+/u);
if (resolvedImageId !== imageId || !["linux/arm64", "linux/amd64"].includes(platform)) throw new Error(`validation executor image identity/platform mismatch: ${inspect.stdout.trim()}`);
const candidateInspect = spawnSync("docker", ["image", "inspect", "--format", "{{.Id}} {{.Os}}/{{.Architecture}}", candidateImageId], { encoding: "utf8", timeout: 10_000, maxBuffer: 10_000 });
if (candidateInspect.error || candidateInspect.status !== 0 || candidateInspect.stdout.trim() !== `${candidateImageId} linux/arm64`) throw new Error(`pinned ARM64 Python candidate image unavailable or mismatched: ${candidateInspect.stderr || candidateInspect.stdout}`);

const headers = { authorization: `Bearer ${token}`, "x-stockquant-service-id": "quant-validation-worker" };
const inputResponse = await fetch(`${base}/v1/promotions/${promotionRequestId}/validation-input`, { headers, signal: AbortSignal.timeout(10_000) });
if (!inputResponse.ok) throw new Error(`validation input unavailable (${inputResponse.status})`);
const input = await inputResponse.json();
if (input.schemaVersion !== "v3.2-independent-validation-input-v1" || input.promotionRequestId !== promotionRequestId || input.request?.candidateSource !== "FIXTURE") throw new Error("only an immutable FIXTURE PromotionRequest is supported; real candidates remain NOT_RUN");
const artifactResponse = await fetch(`${researchAutomationBase}/v1/promotions/${promotionRequestId}/candidate-artifact`, { headers, signal: AbortSignal.timeout(10_000) });
if (!artifactResponse.ok) throw new Error(`submitted candidate Artifact unavailable (${artifactResponse.status})`);
const artifactResult = await artifactResponse.json();
if (artifactResult.schemaVersion !== "v3.2-candidate-artifact-result-v1" || artifactResult.promotionRequestId !== promotionRequestId || artifactResult.ref?.artifactId !== input.request.candidateArtifact.artifactId || artifactResult.ref?.namespace !== input.request.candidateArtifact.namespace || artifactResult.ref?.sha256 !== input.request.candidateArtifact.sha256 || artifactResult.ref?.kind !== "OUTPUT" || artifactResult.ref?.status !== "PUBLISHED" || typeof artifactResult.contentBase64 !== "string") throw new Error("candidate ArtifactRef does not match the immutable PromotionRequest");
const candidateArtifactBytes = Buffer.from(artifactResult.contentBase64, "base64");
if (sha256(candidateArtifactBytes) !== input.request.candidateArtifact.sha256) throw new Error("candidate Artifact bytes do not match the immutable PromotionRequest hash");
const fixtureNames = ["daily-bars.csv", "candidate.json", "validation-design.json"];
const fixtureBytes = Object.fromEntries(await Promise.all(fixtureNames.map(async (name) => [name, await readFile(join(fixtureDir, name))])));
const fixtureManifest = JSON.parse(await readFile(join(fixtureDir, "manifest.json"), "utf8"));
verifyV32SyntheticFixture({ manifest: fixtureManifest, files: fixtureBytes });
const frozenCandidate = JSON.parse(fixtureBytes["candidate.json"].toString("utf8"));
if (!candidateArtifactBytes.equals(fixtureBytes["candidate.json"]) || frozenCandidate.sourceCode !== "def signal(closes, fast=5, slow=20): return sum(closes[-fast:])/fast > sum(closes[-slow:])/slow" || sha256(Buffer.from(frozenCandidate.sourceCode)) !== "9392a720f5e7576f7047b93c212b0d3776e3621a2379e1878a25e93cfb6303ff" || sha256(fixtureBytes["candidate.json"]) !== "ab09b5e966c0e5c179dc423a56250e08354cc20795ba12761cfab8b98ea707d4") throw new Error("submitted candidate bytes differ from the exact allowlisted frozen Fixture artifact");

const scratchDir = await mkdtemp(join(tmpdir(), "stockquant-v32-validation-"));
try {
  const inputPath = join(scratchDir, "promotion-request.json");
  const candidateArtifactPath = join(scratchDir, "candidate-artifact.json");
  const candidateDecisionsPath = join(scratchDir, "candidate-decisions.json");
  await writeFile(inputPath, JSON.stringify({ requestFingerprint: input.requestFingerprint, request: input.request }), { flag: "wx", mode: 0o600 });
  await writeFile(candidateArtifactPath, candidateArtifactBytes, { flag: "wx", mode: 0o600 });
  const escapeMountPath = (path) => resolve(path).replaceAll(",", "\\,");
  const mount = (source, target) => `type=bind,src=${escapeMountPath(source)},dst=${target},readonly`;
  const candidateContainerName = `stockquant-v32-candidate-${randomUUID().replaceAll("-", "")}`;
  const candidateRun = spawnSync("docker", [
    "run", "--rm", "--name", candidateContainerName, "--pull", "never", "--platform", "linux/arm64", "--network", "none", "--read-only",
    "--user", "65532:65532", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--memory", "256m", "--cpus", "1",
    "--mount", mount(candidateRunner, "/candidate/run.py"), "--mount", mount(fixtureDir, "/fixtures"), "--mount", mount(inputPath, "/inputs/promotion-request.json"), "--mount", mount(candidateArtifactPath, "/inputs/candidate-artifact.json"),
    "--entrypoint", "python", candidateImageId, "-I", "-B", "/candidate/run.py", "/fixtures", "/inputs/promotion-request.json", "/inputs/candidate-artifact.json"
  ], { cwd: root, encoding: "utf8", timeout: 60_000, maxBuffer: 2_000_000 });
  if (candidateRun.error || candidateRun.status !== 0) throw new Error(`isolated candidate execution failed: ${candidateRun.error?.message ?? candidateRun.stderr.slice(0, 500)}`);
  const candidateResidual = spawnSync("docker", ["container", "inspect", candidateContainerName], { encoding: "utf8", timeout: 10_000, maxBuffer: 10_000 });
  if (!candidateResidual.error && candidateResidual.status === 0) throw new Error("isolated candidate container remained after completion");
  const candidateResult = JSON.parse(candidateRun.stdout);
  if (candidateResult.status !== "PASS" || candidateResult.promotionRequestId !== promotionRequestId || candidateResult.testRunId !== input.request.testRunId || candidateResult.candidateSourceExecution !== "EXECUTED_IN_ISOLATED_CONTAINER") throw new Error("candidate output is not bound to the immutable request");
  await writeFile(candidateDecisionsPath, JSON.stringify(candidateResult), { flag: "wx", mode: 0o600 });
  const containerName = `stockquant-v32-evaluator-${randomUUID().replaceAll("-", "")}`;
  const evaluated = spawnSync("docker", [
    "run", "--rm", "--name", containerName, "--pull", "never", "--platform", platform, "--network", "none", "--read-only",
    "--user", "65532:65532", "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
    "--pids-limit", "64", "--memory", "256m", "--cpus", "1",
    "--mount", mount(evaluator, "/validation/scripts/evaluator.mjs"),
    "--mount", mount(distDir, "/validation/dist"),
    "--mount", mount(fixtureDir, "/fixtures"),
    "--mount", mount(inputPath, "/inputs/promotion-request.json"),
    "--mount", mount(candidateArtifactPath, "/inputs/candidate-artifact.json"),
    "--mount", mount(candidateDecisionsPath, "/inputs/candidate-decisions.json"),
    "--entrypoint", "node", imageId, "/validation/scripts/evaluator.mjs", "/inputs/promotion-request.json", "/fixtures", "/inputs/candidate-decisions.json", "/inputs/candidate-artifact.json"
  ], { cwd: root, encoding: "utf8", timeout: 120_000, maxBuffer: 2_000_000 });
  if (evaluated.error || evaluated.status !== 0) throw new Error(`isolated Fixture evaluator failed: ${evaluated.error?.message ?? evaluated.stderr.slice(0, 500)}`);
  const residual = spawnSync("docker", ["container", "inspect", containerName], { encoding: "utf8", timeout: 10_000, maxBuffer: 10_000 });
  if (!residual.error && residual.status === 0) throw new Error("isolated evaluator container remained after completion");
  const result = JSON.parse(evaluated.stdout);
  if (result.status !== "PASS" || result.requestFingerprint !== input.requestFingerprint) throw new Error("isolated evaluator output is not bound to the immutable request");
  const parsed = parseValidationSubmission({ schemaVersion: "v3.2-independent-validation-submission-v1", report: result.report, evidence: result.evidence });
  if (!parsed.ok || parsed.submission.report.promotionRequestId !== promotionRequestId) throw new Error(`isolated evaluator returned an invalid report: ${parsed.ok ? "request ID mismatch" : parsed.reason}`);
  const submission = { schemaVersion: "v3.2-independent-validation-submission-v1", report: parsed.submission.report, evidence: parsed.submission.evidence };
  const response = await fetch(`${base}/v1/promotions/${promotionRequestId}/validation-report`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(submission), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`validation report persistence failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  console.log(JSON.stringify({ status: "PASS", sourceMode: "FIXTURE", promotionRequestId, report: submission.report, evidence: submission.evidence, persistence: (await response.json()).idempotent ? "IDEMPOTENT_REPLAY" : "PERSISTED", evaluator: { imageId, platform, network: "none", rootFilesystem: "read-only", fixtureAndInputs: "read-only", user: "65532:65532", memoryLimit: "256m", cpus: 1, pidsLimit: 64, containerLifecycle: "REMOVED_AFTER_COMPLETION", isolationObservedInContainer: result.isolation }, candidateExecutor: { imageId: candidateImageId, platform: "linux/arm64", network: "none", rootFilesystem: "read-only", fixtureAndInputs: "read-only", user: "65532:65532", memoryLimit: "256m", cpus: 1, pidsLimit: 64, containerLifecycle: "REMOVED_AFTER_COMPLETION", decisionCount: candidateResult.decisionCount, candidateCodeSha256: candidateResult.candidateCodeSha256, isolationObservedInContainer: candidateResult.isolation }, qlib: "NOT_RUN", candidateCodeExecution: "EXECUTED_FOR_ALLOWLISTED_FIXTURE", realCandidateValidation: "NOT_RUN" }));
} finally {
  await rm(scratchDir, { recursive: true, force: true });
}
