import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { auditTestRunEvidence } from "./version-gate-test-run-evidence.mjs";

const runId = "123e4567-e89b-42d3-a456-426614174000";

async function fixtureRoot(t) {
  const root = await mkdtemp(join(tmpdir(), "stockquant-version-evidence-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function publishBundle(root, { testRunId = runId, stageId = "V2.5", exportStageId = stageId, exportRunId = testRunId, flat = false, nestedStatusTopAssertions = false } = {}) {
  const directory = join(root, "evidence", "local", stageId, testRunId);
  await mkdir(directory, { recursive: true });
  const evidence = {
    evidenceVersion: "acceptance-export-v2-1",
    stageId: exportStageId,
    testRunId: exportRunId,
    run: { stageId: exportStageId, testRunId: exportRunId, status: "COMPLETED", assertions: [{ status: "PASS" }] },
  };
  if (flat) {
    evidence.status = evidence.run.status;
    evidence.assertions = evidence.run.assertions;
    delete evidence.run;
  }
  if (nestedStatusTopAssertions) {
    evidence.assertions = evidence.run.assertions;
    evidence.run = { stageId: exportStageId, testRunId: exportRunId, status: "COMPLETED" };
  }
  const bytes = `${JSON.stringify(evidence, null, 2)}\n`;
  await writeFile(join(directory, "evidence.json"), bytes);
  const hash = createHash("sha256").update(bytes).digest("hex");
  await writeFile(join(directory, "manifest.sha256"), `${hash}  evidence.json\n`);
  return directory;
}

async function publishV33Bundle(root, { tamperArtifact = false } = {}) {
  const directory = join(root, "evidence", "local", "V3.3", runId);
  await mkdir(directory, { recursive: true });
  const output = (roundIndex) => Buffer.from(`${JSON.stringify({ fixtureId: "v3.1-research-small-sample-1", bars: 6, qlibVersion: "0.9.6.99", return: 0.12, roundIndex })}\n`);
  const artifacts = [1, 2].map((roundIndex) => {
    const bytes = output(roundIndex);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const filename = `v33-round-${roundIndex}-${sha256}.json`;
    return { roundIndex, artifactId: `output-round-${roundIndex}-${sha256.slice(0, 16)}`, sha256, namespace: `research/${runId}/exp-1/outputs`, status: "PUBLISHED", filename, bytes };
  });
  const summary = { testRunId: runId, totals: { experiments: 1, requestedCents: 80, reservedCents: 0, settledCents: 46, unknownReservedCents: 0, modelCallCount: 2 }, rows: [{ experimentId: "exp-1", rounds: 2, requestedCents: 80, reservedCents: 0, settledCents: 46, unknownReservedCents: 0, modelCallCount: 2, status: "SETTLED", roundBudget: [1, 2].map((roundIndex) => ({ roundIndex, allocatedCents: 40, usedCents: 23, unknownReservedCents: 0 })) }] };
  const run = { testRunId: runId, stageId: "V3.3", scenarioId: "normal", scenarioVersion: "v3.3-readiness-v1", status: "RUNNING", assertions: [{ id: "V3.3_NORMAL_RESULTS_001", status: "PASS" }], evidence: { workflowStep: "NORMAL_ASSERTION_VERIFIED", businessValidation: "PASS", humanAcceptance: "NOT_RUN", experiment: { experimentId: "exp-1" }, completedRounds: artifacts.map((artifact) => ({ roundIndex: artifact.roundIndex, artifacts: [{ ...artifact, kind: "OUTPUT", metrics: { fixtureId: "v3.1-research-small-sample-1", bars: 6, qlibVersion: "0.9.6.99", return: 0.12 } }] })), normalAssertion: { result: "PASS", budgetSummary: summary, outputs: artifacts.map((artifact) => ({ roundIndex: artifact.roundIndex, artifactId: artifact.artifactId, sha256: artifact.sha256, valid: true })) } } };
  const evidence = { evidenceVersion: "acceptance-export-v3-3-business-testrun-1", stageId: "V3.3", testRunId: runId, scenarioId: "normal", status: "RUNNING", businessValidation: "PASS", humanAcceptance: "NOT_RUN", artifacts: artifacts.map(({ bytes, ...descriptor }) => descriptor), run };
  const evidenceBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`);
  await writeFile(join(directory, "evidence.json"), evidenceBytes);
  const manifestEntries = [`${createHash("sha256").update(evidenceBytes).digest("hex")}  evidence.json`];
  for (const artifact of artifacts) {
    const bytes = tamperArtifact && artifact.roundIndex === 2 ? Buffer.from("tampered") : artifact.bytes;
    await writeFile(join(directory, artifact.filename), bytes);
    manifestEntries.push(`${createHash("sha256").update(bytes).digest("hex")}  ${artifact.filename}`);
  }
  await writeFile(join(directory, "manifest.sha256"), `${manifestEntries.join("\n")}\n`);
  return directory;
}

function row({ stageId = "V2.5", evidence = runId, signoff = `用户确认 ${runId} / 2026-10-02` } = {}) {
  return { stageId, evidence, signoff };
}

test("exact TestRun, stage export, all-PASS assertions, manifest hash, and dated bound sign-off allow a PASS claim", async (t) => {
  const root = await fixtureRoot(t);
  await publishBundle(root);
  const audit = await auditTestRunEvidence(root, [row()], [{ stageId: "V2.5", status: "PASS" }]);
  assert.equal(audit.status, "PASS");
  assert.equal(audit.testRunIdsChecked, 1);
  assert.deepEqual(audit.unresolvedAssociations, []);
});

test("canonical evidence-export v2 flat TestRun responses support PASS verification", async (t) => {
  const root = await fixtureRoot(t);
  await publishBundle(root, { flat: true });
  const audit = await auditTestRunEvidence(root, [row()], [{ stageId: "V2.5", status: "PASS" }]);
  assert.equal(audit.status, "PASS");
  assert.deepEqual(audit.unresolvedAssociations, []);
});

test("legacy wrapped TestRun status with envelope-level assertions supports PASS verification", async (t) => {
  const root = await fixtureRoot(t);
  await publishBundle(root, { nestedStatusTopAssertions: true });
  const audit = await auditTestRunEvidence(root, [row()], [{ stageId: "V2.5", status: "PASS" }]);
  assert.equal(audit.status, "PASS");
  assert.deepEqual(audit.unresolvedAssociations, []);
});

test("a missing structured export remains INCOMPLETE and cannot be inferred from a UUID alone", async (t) => {
  const root = await fixtureRoot(t);
  const audit = await auditTestRunEvidence(root, [row()], [{ stageId: "V2.5", status: "PARTIALLY_IMPLEMENTED" }]);
  assert.equal(audit.status, "INCOMPLETE");
  assert.match(audit.unresolvedAssociations[0].failures.join(" "), /structured run export is missing/u);
});

test("account UUIDs adjacent to TestRun evidence are not treated as TestRun exports", async (t) => {
  const root = await fixtureRoot(t);
  const accountId = "223e4567-e89b-42d3-a456-426614174001";
  await publishBundle(root);
  const audit = await auditTestRunEvidence(
    root,
    [row({ evidence: `normal TestRun ${runId} / \x60account ${accountId}\x60 / Manifest hash verified` })],
    [{ stageId: "V2.5", status: "PARTIALLY_IMPLEMENTED" }],
  );
  assert.equal(audit.status, "PASS");
  assert.equal(audit.testRunIdsChecked, 1);
  assert.deepEqual(audit.results[0].testRunIds, [runId]);
  assert.deepEqual(audit.unresolvedAssociations, []);
});

test("stage or run identity mismatch and manifest tampering fail the association audit", async (t) => {
  const root = await fixtureRoot(t);
  await publishBundle(root, { exportStageId: "V2.4" });
  const stageMismatch = await auditTestRunEvidence(root, [row()], [{ stageId: "V2.5", status: "PARTIALLY_IMPLEMENTED" }]);
  assert.equal(stageMismatch.status, "FAIL");
  assert.match(stageMismatch.unresolvedAssociations[0].failures.join(" "), /export stageId mismatch/u);

  const directory = await publishBundle(root);
  await writeFile(join(directory, "manifest.sha256"), `${"0".repeat(64)}  evidence.json\n`);
  const tampered = await auditTestRunEvidence(root, [row()], [{ stageId: "V2.5", status: "PARTIALLY_IMPLEMENTED" }]);
  assert.equal(tampered.status, "FAIL");
  assert.match(tampered.unresolvedAssociations[0].failures.join(" "), /manifest hash mismatch/u);
});

test("PASS requires the human sign-off to name the same TestRun", async (t) => {
  const root = await fixtureRoot(t);
  await publishBundle(root);
  const audit = await auditTestRunEvidence(root, [row({ signoff: "用户确认 / 2026-10-02" })], [{ stageId: "V2.5", status: "PASS" }]);
  assert.equal(audit.status, "FAIL");
  assert.match(audit.unresolvedAssociations[0].failures.join(" "), /not bound to an exact TestRun UUID/u);
});

test("V3.3 structured normal export independently verifies both Artifact bytes, Fixture metrics, and same-Run assertion", async (t) => {
  const root = await fixtureRoot(t);
  await publishV33Bundle(root);
  const audit = await auditTestRunEvidence(root, [row({ stageId: "V3.3", signoff: "人工验收未签署" })], [{ stageId: "V3.3", status: "NOT_RUN" }]);
  assert.equal(audit.status, "PASS");
  assert.deepEqual(audit.unresolvedAssociations, []);
});

test("V3.3 structured export detects Artifact corruption even when its file manifest is recalculated", async (t) => {
  const root = await fixtureRoot(t);
  await publishV33Bundle(root, { tamperArtifact: true });
  const audit = await auditTestRunEvidence(root, [row({ stageId: "V3.3", signoff: "人工验收未签署" })], [{ stageId: "V3.3", status: "NOT_RUN" }]);
  assert.equal(audit.status, "FAIL");
  assert.match(audit.unresolvedAssociations[0].failures.join(" "), /round 2 Artifact verification failed/u);
});
