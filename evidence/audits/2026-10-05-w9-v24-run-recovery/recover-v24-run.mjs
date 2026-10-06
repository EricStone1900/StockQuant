import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const testRunId = "bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1";
const snapshotDirectory = "evidence/audits/2026-10-02-v24-isolated-db-snapshots-912a971fa6374e339157f75bee08b5f6";
const sourcePaths = [
  `${snapshotDirectory}/sq_v24_paper_platform_912a971fa6374e339157f75bee08b5f6.json`,
  `${snapshotDirectory}/sq_v24_paper_trade_912a971fa6374e339157f75bee08b5f6.json`,
  `${snapshotDirectory}/sq_v24_paper_portfolio_912a971fa6374e339157f75bee08b5f6.json`,
  `${snapshotDirectory}/sq_v24_paper_governance_912a971fa6374e339157f75bee08b5f6.json`,
  `evidence/audits/2026-10-02-v24-paper-smoke-912a971fa6374e339157f75bee08b5f6.json`,
  `evidence/audits/2026-10-02-v24-paper-web-e2e-${testRunId}.json`,
];
const screenshotPath = `evidence/audits/2026-10-02-v24-paper-web-external-reconciliation-${testRunId}.png`;
const pointInTimeManifest = "evidence/audits/2026-10-05-w0-after-v11-recovery-final.files.sha256";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

const manifestEntries = new Map((await readFile(resolve(root, pointInTimeManifest), "utf8"))
  .split(/\r?\n/u).filter(Boolean).map((line) => {
    const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/u);
    assert.ok(match, "existing W0 manifest must parse");
    return [match[2], match[1]];
  }));
const sources = [];
const parsed = new Map();
for (const path of [...sourcePaths, screenshotPath]) {
  const bytes = await readFile(resolve(root, path));
  const digest = hash(bytes);
  assert.equal(manifestEntries.get(path), digest, `source must match the existing W0 snapshot: ${path}`);
  sources.push({ path, sha256: digest, sizeBytes: bytes.length });
  if (path.endsWith(".json")) parsed.set(path, JSON.parse(bytes.toString("utf8")));
}

const platformSnapshotPath = sourcePaths[0];
const platformSnapshot = parsed.get(platformSnapshotPath);
const rows = platformSnapshot.tables.acceptance_stage_runs.filter((row) => row.test_run_id === testRunId);
assert.equal(rows.length, 1, "exactly one persisted Platform stage-run snapshot is required");
const row = rows[0];
assert.equal(row.stage_id, "V2.4");
assert.equal(row.scenario_id, "external-reconciliation");
assert.equal(row.status, "COMPLETED");
const assertions = row.evidence.assertions;
assert.ok(Array.isArray(assertions) && assertions.length > 0);
assert.ok(assertions.every((assertion) => assertion.status === "PASS"));
assert.equal(row.evidence.testRunId, testRunId);
assert.equal(row.evidence.humanAcceptance, "NOT_RUN");
assert.equal(parsed.get(platformSnapshotPath).tables.acceptance_records.filter((record) => record.test_run_id === testRunId).length, 0);

const e2ePath = sourcePaths.at(-1);
const e2e = parsed.get(e2ePath);
const webRun = e2e.scenarios.find((scenario) => scenario.testRunId === testRunId);
assert.ok(webRun, "Web E2E audit must contain the exact TestRun");
assert.equal(webRun.status, "COMPLETED");
assert.equal(webRun.cliCheckOnly, true);
assert.equal(webRun.screenshot, screenshotPath);
assert.deepEqual(
  webRun.assertions.map(({ assertionId, status }) => ({ assertionId, status })),
  assertions.map(({ assertionId, status }) => ({ assertionId, status })),
  "Web audit assertion identities/statuses must match the persisted TestRun snapshot",
);

const outputDirectory = resolve(root, "evidence/local/V2.4", testRunId);
await mkdir(outputDirectory, { recursive: false });
const sourceReferences = sources.map(({ path, sha256 }) => ({ path, sha256 }));
const run = {
  testRunId,
  stageId: row.stage_id,
  scenarioId: row.scenario_id,
  scenarioVersion: row.scenario_version,
  seed: row.seed,
  namespace: row.namespace,
  ownerId: row.owner_id,
  createdAt: row.created_at,
  completedAt: row.completed_at,
  status: row.status,
  ...row.evidence,
  assertions,
};
const evidence = {
  evidenceVersion: "acceptance-export-v2-1",
  stageId: "V2.4",
  testRunId,
  run,
  recoveredFrom: {
    method: "exact persisted Platform JSONB row in the isolated database snapshot, cross-checked against the original Web E2E audit and four service database snapshots",
    webAndCli: { status: webRun.status, cliCheckOnly: webRun.cliCheckOnly, screenshot: webRun.screenshot },
    sources: sourceReferences,
    humanAcceptance: "NOT_RUN",
  },
};
const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
await writeFile(resolve(outputDirectory, "evidence.json"), serialized, { flag: "wx" });
const evidenceHash = hash(serialized);
await writeFile(resolve(outputDirectory, "manifest.sha256"), `${evidenceHash}  evidence.json\n`, { flag: "wx" });

const recovery = {
  schemaVersion: "w9-v24-test-run-recovery-v1",
  capturedAt: new Date().toISOString(),
  testRunId,
  stageId: row.stage_id,
  scenarioId: row.scenario_id,
  persistedStatus: row.status,
  assertions: assertions.map(({ assertionId, status }) => ({ assertionId, status })),
  webStatus: webRun.status,
  cliCheckOnly: webRun.cliCheckOnly,
  humanAcceptance: "NOT_RUN",
  evidencePath: `evidence/local/V2.4/${testRunId}/evidence.json`,
  evidenceSha256: evidenceHash,
  sources,
  limitations: [
    "Recovered from an existing exact-run database snapshot and same-run Web/CLI evidence; this is not a newly executed business run.",
    "No per-run acceptance record exists; the human conclusion remains NOT_RUN.",
    "No result or signature is inferred beyond the persisted row, matching assertion statuses, Web report, CLI check-only result, and preserved screenshot.",
    "The snapshot does not establish live source authorization, real-market behavior, or the outstanding 20-day observation gate.",
  ],
};
await writeFile(resolve(root, "evidence/audits/2026-10-05-w9-v24-run-recovery/recovery.json"), `${JSON.stringify(recovery, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ testRunId, status: row.status, assertions: assertions.length, cliCheckOnly: webRun.cliCheckOnly, humanAcceptance: "NOT_RUN", evidenceSha256: evidenceHash, verifiedSources: sources.length }, null, 2));
