import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildIndependentValidationReport } from "../dist/independent-validation.js";
import { parsePromotionRequest } from "../dist/promotion-request.js";
import { recomputeV32SyntheticFixture, verifyV32SyntheticFixture } from "../dist/v32-independent-recompute.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fixtureDir = join(root, "fixtures/v3/v3.2-independent-validation-v1");
const crosscheckScript = resolve(dirname(fileURLToPath(import.meta.url)), "v32-independent-fixture-crosscheck.py");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stable = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
const fixtureNames = ["daily-bars.csv", "candidate.json", "validation-design.json"];
const [manifestBytes, ...fixtureBytes] = await Promise.all(["manifest.json", ...fixtureNames].map((name) => readFile(join(fixtureDir, name))));
const manifest = JSON.parse(manifestBytes);
verifyV32SyntheticFixture({ manifest, files: Object.fromEntries(fixtureNames.map((name, index) => [name, fixtureBytes[index]])) });
const [barsCsv, candidateBytes, designBytes] = fixtureBytes;
const candidate = JSON.parse(candidateBytes);
const design = JSON.parse(designBytes);
const scenario = JSON.parse(await readFile(join(root, "packages/contracts/fixtures/v3.2-promotion-eligible-fixture-v1.json"), "utf8"));
const { testRunId, experimentId, promotionRequestId } = scenario.request;
const dataContentSha256 = digest(Buffer.from(JSON.stringify([{ path: "data/daily-bars.csv", sha256: digest(barsCsv) }]), "utf8"));
const dataManifestBytes = stable({ schemaVersion: "v3.2-data-manifest-v1", testRunId, experimentId, dataMode: "FIXTURE", dataVersion: "v3.2-independent-validation-1", dataContentSha256 });
const validationPlanBytes = stable({ schemaVersion: "v3.2-validation-plan-v1", testRunId, experimentId, candidateSource: "FIXTURE", dataManifestSha256: digest(dataManifestBytes), candidateOutputPath: "candidate.json", generatedCodeOutputPath: "generated.py", metricsOutputPath: "metrics.json" });
const recomputed = recomputeV32SyntheticFixture({ barsCsv: barsCsv.toString("utf8"), candidate, design });
const imageRef = process.env.STOCKQUANT_V32_RECOMPUTE_IMAGE ?? "stockquant-v12-qlib-worker:latest";
const imageInfo = execFileSync("docker", ["image", "inspect", "--format", "{{.Id}} {{.Os}}/{{.Architecture}}", imageRef], { cwd: root, encoding: "utf8", timeout: 10_000 }).trim();
const imageMatch = /^(sha256:[a-f0-9]{64}) (linux\/amd64)$/u.exec(imageInfo);
if (!imageMatch) throw new Error(`independent recomputation requires a cached immutable linux/amd64 image; got ${imageInfo || "no image metadata"}`);
const imageId = imageMatch[1];
const escapeMountPath = (path) => resolve(path).replaceAll(",", "\\,");
const mount = (source, target) => `type=bind,src=${escapeMountPath(source)},dst=${target},readonly`;
const python = spawnSync("docker", [
  "run", "--rm", "--pull", "never", "--platform", "linux/amd64", "--network", "none", "--read-only",
  "--user", "65532:65532", "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
  "--pids-limit", "64", "--memory", "256m", "--cpus", "1",
  "--mount", mount(crosscheckScript, "/validation/v32-independent-fixture-crosscheck.py"),
  "--mount", mount(fixtureDir, "/fixtures"),
  "--entrypoint", "python", imageId, "-I", "-B", "/validation/v32-independent-fixture-crosscheck.py", "/fixtures",
], { cwd: root, encoding: "utf8", timeout: 120_000, maxBuffer: 2_000_000 });
if (python.error || python.status !== 0) throw new Error(`isolated linux/amd64 Python recomputation failed: ${python.error?.message ?? python.stderr}`);
const pythonResult = JSON.parse(python.stdout);
const typescriptOos = recomputed.evidence.OUT_OF_SAMPLE;
const typescriptCost = recomputed.evidence.COST;
const tolerance = Number(design.checks.cost.toleranceAbsoluteReturn);
const close = (left, right, epsilon = 1e-10) => Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= epsilon;
const sameTrades = typescriptOos.trades.length === pythonResult.trades.length && typescriptOos.trades.every((trade, index) => {
  const other = pythonResult.trades[index];
  return trade.security === other.security && trade.decisionDate === other.decisionDate && trade.executionDate === other.executionDate && trade.side === other.side && trade.quantity === other.quantity && trade.realizedVolume === other.realizedVolume && close(trade.executionOpen, other.executionOpen) && close(trade.participation, other.participation) && close(trade.fee, other.fee);
});
const crossRuntimeMatched = sameTrades && pythonResult.decisionsChecked === typescriptOos.decisionCount && pythonResult.ordersSubmitted === typescriptOos.ordersSubmitted && pythonResult.pitViolations.length === 0 && pythonResult.capacityViolations.length === 0 && close(pythonResult.grossReturn, typescriptOos.grossReturn, tolerance) && close(pythonResult.netReturn, typescriptOos.netReturn, tolerance) && close(pythonResult.totalFees, typescriptCost.totalFees);
if (!crossRuntimeMatched) throw new Error(`independent Python recomputation differs from TypeScript reference: ${python.stderr || JSON.stringify(pythonResult)}`);
const request = {
  schemaVersion: "v3.2-promotion-request-v1", promotionRequestId, testRunId, experimentId, candidateSource: "FIXTURE",
  candidateArtifact: { artifactId: candidate.candidateId, namespace: `research/${testRunId}/${experimentId}/outputs`, sha256: digest(candidateBytes) },
  codeSha256: digest(candidate.sourceCode), dataManifestSha256: digest(dataManifestBytes),
  metricsManifestSha256: digest(stable(recomputed.evidence.OUT_OF_SAMPLE)), validationPlanSha256: digest(validationPlanBytes),
  budget: { allocationId: "synthetic-fixture-budget", currency: "USD", reservedMinor: 100, consumedMinor: 0 },
  idempotencyKey: "v32-synthetic-independent-validation-v1",
};
const parsedRequest = parsePromotionRequest(request);
if (!parsedRequest.ok) throw new Error(`fixture PromotionRequest is invalid: ${parsedRequest.reason}`);
const report = buildIndependentValidationReport(parsedRequest.request, recomputed.checks);
const evidenceBundle = Object.fromEntries(Object.entries(recomputed.evidence).map(([checkId, item]) => {
  const { evidenceSha256, ...details } = item;
  return [checkId, { evidenceSha256, details }];
}));
const submission = { schemaVersion: "v3.2-independent-validation-submission-v1", report, evidence: evidenceBundle };
console.log(JSON.stringify({ status: "FIXTURE_RECOMPUTED", identitySource: "STATIC_CONTRACT_FIXTURE_IDS_NOT_PERSISTED", request, submission, evidence: recomputed.evidence, crossRuntimeRecomputation: { status: "PASS", implementation: "independent Python standard-library evaluator in isolated Docker container", decisionsChecked: pythonResult.decisionsChecked, tradesMatched: sameTrades, returnsWithinAbsoluteTolerance: tolerance, executorImageId: imageId, containerPlatform: "linux/amd64", network: "none", fixtureMount: "read-only", qlibExecution: "NOT_RUN" }, execution: "trusted deterministic reference implementation; candidate source not executed", persistence: "NOT_PERFORMED", humanAcceptance: "NOT_RUN", registryMutation: "NOT_PERFORMED", sourceMode: "FIXTURE", profitabilityClaim: "NOT_MADE" }, null, 2));
