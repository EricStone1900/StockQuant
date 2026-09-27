import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parsePromotionRequest, promotionRequestFingerprint } from "../dist/promotion-request.js";
import { buildIndependentValidationReport } from "../dist/independent-validation.js";
import { recomputeV32SyntheticFixture, verifyV32SyntheticFixture } from "../dist/v32-independent-recompute.js";

const [requestPath, fixtureDirArg, candidateDecisionsPath, candidateArtifactPath] = process.argv.slice(2);
if (!requestPath || !fixtureDirArg || !candidateDecisionsPath || !candidateArtifactPath) throw new Error("expected request JSON, read-only Fixture directory, isolated candidate decisions, and submitted candidate Artifact");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stable = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
const readFirst = async (paths) => {
  for (const path of paths) {
    try { return (await readFile(path, "utf8")).trim(); } catch { /* try the next cgroup layout */ }
  }
  throw new Error(`required isolation observation is unavailable: ${paths.join(", ")}`);
};
const mountRows = (await readFile("/proc/mounts", "utf8")).split("\n").filter(Boolean).map((line) => line.split(" "));
const rootMount = mountRows.find((row) => row[1] === "/");
if (!rootMount?.[3]?.split(",").includes("ro")) throw new Error("evaluator root filesystem is not read-only");
for (const point of ["/fixtures", "/inputs/promotion-request.json", "/inputs/candidate-decisions.json", "/inputs/candidate-artifact.json", "/validation/dist", "/validation/scripts/evaluator.mjs"]) {
  const mount = mountRows.find((row) => row[1] === point);
  if (!mount?.[3]?.split(",").includes("ro")) throw new Error(`evaluator input mount is not read-only: ${point}`);
}
if (process.getuid?.() !== 65532) throw new Error("evaluator is not running under the expected non-root UID");
const memoryMax = Number(await readFirst(["/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes"]));
if (memoryMax !== 268435456) throw new Error(`evaluator memory cgroup differs from 256 MiB limit: ${memoryMax}`);
let cpuQuota;
const cpuV2 = (await readFirst(["/sys/fs/cgroup/cpu.max"]).catch(() => "")).split(/\s+/u);
if (cpuV2.length === 2 && cpuV2[0] !== "max") cpuQuota = Number(cpuV2[0]) / Number(cpuV2[1]);
else {
  const quota = Number(await readFirst(["/sys/fs/cgroup/cpu/cpu.cfs_quota_us"]));
  const period = Number(await readFirst(["/sys/fs/cgroup/cpu/cpu.cfs_period_us"]));
  cpuQuota = quota / period;
}
if (!Number.isFinite(cpuQuota) || cpuQuota <= 0 || cpuQuota > 1) throw new Error(`evaluator CPU cgroup exceeds one CPU: ${cpuQuota}`);
const pidsMax = Number(await readFirst(["/sys/fs/cgroup/pids.max", "/sys/fs/cgroup/pids/pids.max"]));
if (pidsMax !== 64) throw new Error(`evaluator PID cgroup differs from 64 limit: ${pidsMax}`);
const networkCounters = (await readFile("/proc/net/dev", "utf8")).split("\n").slice(2).filter(Boolean).map((line) => { const [name, counters] = line.split(":"); return { name: name.trim(), counters: counters.trim().split(/\s+/u).map(Number) }; });
const networkInterfaces = await (await import("node:fs/promises")).readdir("/sys/class/net");
const realInterfaces = [];
for (const name of networkInterfaces) {
  try {
    const operstate = (await readFile(`/sys/class/net/${name}/operstate`, "utf8")).trim();
    const flags = (await readFile(`/sys/class/net/${name}/flags`, "utf8")).trim();
    realInterfaces.push({ name, operstate, flags });
  } catch { /* bonding_masters is a control file, not a network interface */ }
}
const routeRows = (await readFile("/proc/net/route", "utf8")).trim().split("\n").slice(1).filter(Boolean);
const ipv6Rows = (await readFile("/proc/net/if_inet6", "utf8")).trim().split("\n").filter(Boolean);
if (realInterfaces.length === 0 || !realInterfaces.some((item) => item.name === "lo") || realInterfaces.some((item) => item.name !== "lo" && item.operstate !== "down")) throw new Error(`network-none evaluator has an active non-loopback interface: ${JSON.stringify(realInterfaces)}`);
if (routeRows.length !== 0 || ipv6Rows.some((line) => line.trim().split(/\s+/u).at(-1) !== "lo")) throw new Error("network-none evaluator has a non-loopback route or IPv6 address");
if (networkCounters.some(({ name, counters }) => name !== "lo" && counters.some((value) => value !== 0))) throw new Error("network-none evaluator has non-loopback network traffic");
const isolation = { uid: process.getuid(), rootFilesystem: "read-only", inputs: "read-only", network: "none", networkInterfaces: realInterfaces, routes: routeRows.length, ipv6Addresses: ipv6Rows.length, nonLoopbackTrafficBytes: networkCounters.filter(({ name }) => name !== "lo").reduce((sum, { counters }) => sum + counters[0] + counters[8], 0), memoryBytes: memoryMax, cpuQuota, pidsMax };
const input = JSON.parse(await readFile(requestPath, "utf8"));
const parsed = parsePromotionRequest(input.request);
if (!parsed.ok || promotionRequestFingerprint(parsed.request) !== input.requestFingerprint) throw new Error("immutable PromotionRequest fingerprint is invalid");
if (parsed.request.candidateSource !== "FIXTURE") throw new Error("only the allowlisted synthetic Fixture candidate is supported");
const fixtureDir = resolve(fixtureDirArg);
const names = ["daily-bars.csv", "candidate.json", "validation-design.json"];
const [manifestBytes, ...fileBytes] = await Promise.all(["manifest.json", ...names].map((name) => readFile(resolve(fixtureDir, name))));
const manifest = JSON.parse(manifestBytes.toString("utf8"));
verifyV32SyntheticFixture({ manifest, files: Object.fromEntries(names.map((name, index) => [name, fileBytes[index]])) });
const [bars, _frozenCandidateBytes, designBytes] = fileBytes;
const candidateBytes = await readFile(resolve(candidateArtifactPath));
if (!candidateBytes.equals(_frozenCandidateBytes)) throw new Error("submitted candidate Artifact differs from the frozen Fixture candidate");
const candidate = JSON.parse(candidateBytes.toString("utf8"));
const design = JSON.parse(designBytes.toString("utf8"));
const request = parsed.request;
const candidateExecution = JSON.parse(await readFile(candidateDecisionsPath, "utf8"));
if (candidateExecution.status !== "PASS" || candidateExecution.promotionRequestId !== request.promotionRequestId || candidateExecution.testRunId !== request.testRunId || candidateExecution.candidateCodeSha256 !== request.codeSha256 || candidateExecution.candidateSourceExecution !== "EXECUTED_IN_ISOLATED_CONTAINER" || !Array.isArray(candidateExecution.decisions)) throw new Error("isolated candidate output does not match this PromotionRequest");
const candidateIsolation = candidateExecution.isolation;
if (candidateExecution.decisionCount !== candidateExecution.decisions.length || !candidateIsolation || candidateIsolation.uid !== 65532 || candidateIsolation.rootFilesystem !== "read-only" || candidateIsolation.inputs !== "read-only" || candidateIsolation.network !== "none" || candidateIsolation.memoryBytes !== 268435456 || candidateIsolation.cpuQuota > 1 || candidateIsolation.pidsMax !== 64 || candidateIsolation.routes !== 0 || candidateIsolation.nonLoopbackTrafficBytes !== 0) throw new Error("candidate executor output has incomplete count or isolation evidence");
const dataContentSha256 = digest(Buffer.from(JSON.stringify([{ path: "data/daily-bars.csv", sha256: digest(bars) }]), "utf8"));
const dataManifestBytes = stable({ schemaVersion: "v3.2-data-manifest-v1", testRunId: request.testRunId, experimentId: request.experimentId, dataMode: "FIXTURE", dataVersion: manifest.fixtureVersion, dataContentSha256 });
const validationPlanBytes = stable({ schemaVersion: "v3.2-validation-plan-v1", testRunId: request.testRunId, experimentId: request.experimentId, candidateSource: "FIXTURE", dataManifestSha256: digest(dataManifestBytes), candidateOutputPath: "candidate.json", generatedCodeOutputPath: "generated.py", metricsOutputPath: "metrics.json" });
if (request.candidateArtifact.artifactId !== candidate.candidateId || request.candidateArtifact.namespace !== `research/${request.testRunId}/${request.experimentId}/outputs` || request.candidateArtifact.sha256 !== digest(candidateBytes) || request.codeSha256 !== digest(candidate.sourceCode) || request.dataManifestSha256 !== digest(dataManifestBytes) || request.validationPlanSha256 !== digest(validationPlanBytes)) throw new Error("request does not bind to the frozen V3.2 Fixture identity and inputs");
const recomputed = recomputeV32SyntheticFixture({ barsCsv: bars.toString("utf8"), candidate, design, candidateExecution: { codeSha256: candidateExecution.candidateCodeSha256, decisions: candidateExecution.decisions } });
const metricsManifestBytes = stable(recomputed.evidence.OUT_OF_SAMPLE);
if (request.metricsManifestSha256 !== digest(metricsManifestBytes)) throw new Error("request metrics manifest does not match recomputed Fixture metrics");
const report = buildIndependentValidationReport(request, recomputed.checks);
const evidence = Object.fromEntries(Object.entries(recomputed.evidence).map(([checkId, item]) => { const { evidenceSha256, ...details } = item; return [checkId, { details, evidenceSha256 }]; }));
console.log(JSON.stringify({ status: "PASS", requestFingerprint: input.requestFingerprint, report, evidence, isolation, candidateExecution: { candidateCodeSha256: candidateExecution.candidateCodeSha256, decisionCount: candidateExecution.decisionCount, isolation: candidateExecution.isolation } }));
