import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const inputPath = value("--input");
const evidenceRoot = value("--evidence-root");
const auditDirectory = value("--audit-directory");
if (!inputPath || !evidenceRoot || !auditDirectory) {
  console.error("usage: node scripts/recover-legacy-v11-testrun-evidence.mjs --input PATH --evidence-root PATH --audit-directory PATH");
  process.exit(2);
}

const expectedIds = new Set([
  "24276340-2e5a-4516-a7d0-20f92851754b",
  "bdb53484-19b4-4363-a130-eee94761df54",
]);
const sourceBytes = await readFile(resolve(inputPath));
const sourceHash = createHash("sha256").update(sourceBytes).digest("hex");
const rows = sourceBytes.toString("utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const foundIds = new Set();
for (const item of rows) {
  const run = item?.run;
  if (!run || run.stage_id !== "V1.1" || !expectedIds.has(run.test_run_id) || foundIds.has(run.test_run_id)) {
    throw new Error("legacy query rows contain an unexpected, duplicate, or non-V1.1 TestRun");
  }
  if (run.status !== "COMPLETED" || !Array.isArray(item.assertions) || item.assertions.length === 0 || item.assertions.some((a) => a.status !== "PASS")) {
    throw new Error(`TestRun ${run.test_run_id} is not completed with non-empty all-PASS assertions`);
  }
  if (!Array.isArray(item.acceptanceRecords) || item.acceptanceRecords.length > 1) {
    throw new Error(`TestRun ${run.test_run_id} has unsupported acceptance record multiplicity`);
  }
  foundIds.add(run.test_run_id);
}
if (foundIds.size !== expectedIds.size) throw new Error("legacy query did not return the exact expected TestRun set");

const auditRoot = resolve(auditDirectory);
await mkdir(auditRoot, { recursive: false });
const sourceFile = resolve(auditRoot, "legacy-v11-test-run-rows.jsonl");
await writeFile(sourceFile, sourceBytes, { flag: "wx" });
const repoRoot = process.cwd();
const sourceRelativePath = relative(repoRoot, sourceFile).split("\\").join("/");
const recovered = [];
for (const item of rows) {
  const r = item.run;
  const testRunId = r.test_run_id;
  const run = {
    testRunId,
    stageId: r.stage_id,
    scenarioId: r.scenario_id,
    scenarioVersion: r.scenario_version,
    namespace: r.namespace,
    ownerId: r.owner_id,
    status: r.status,
    seed: r.seed,
    accountId: r.account_id,
    createdAt: r.created_at,
    completedAt: r.completed_at,
    error: r.error,
  };
  const assertions = item.assertions.map((a) => ({
    assertionId: a.assertion_id,
    status: a.status,
    expected: a.expected,
    actual: a.actual,
    evidence: a.evidence,
  }));
  const evidence = {
    evidenceVersion: "stockquant.acceptance.run-export.v2",
    stageId: "V1.1",
    testRunId,
    run,
    assertions,
    manualConclusion: item.acceptanceRecords[0]?.conclusion ?? "NOT_RUN",
    sourceExport: {
      path: sourceRelativePath,
      sha256: sourceHash,
      format: "legacy-postgres-select-v1",
    },
  };
  const runDirectory = resolve(evidenceRoot, "V1.1", testRunId);
  await mkdir(runDirectory, { recursive: false });
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  await writeFile(resolve(runDirectory, "evidence.json"), serialized, { flag: "wx" });
  const evidenceHash = createHash("sha256").update(serialized).digest("hex");
  await writeFile(resolve(runDirectory, "manifest.sha256"), `${evidenceHash}  evidence.json\n`, { flag: "wx" });
  recovered.push({ testRunId, scenarioId: r.scenario_id, assertionCount: assertions.length, manualConclusion: evidence.manualConclusion, evidenceSha256: evidenceHash });
}

const report = {
  schemaVersion: "w9-v11-legacy-test-run-recovery-v1",
  source: "isolated copy of Docker Compose volume stockquant-v11_postgres-v11; PostgreSQL 16.9; no source-volume writes",
  sourceRowsPath: sourceRelativePath,
  sourceRowsSha256: sourceHash,
  recovered,
  limitations: [
    "This is a structured recovery from exact legacy PostgreSQL rows, not an original Platform API export.",
    "The source rows contain no human acceptance records; manualConclusion remains NOT_RUN.",
    "No Web screenshot, CLI check-only result, or external domain-service facts are inferred.",
    "The source volume was mounted read-only for copying; only the isolated copy was started for read-only queries.",
  ],
};
await writeFile(resolve(auditRoot, "recovery.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify(report, null, 2));
