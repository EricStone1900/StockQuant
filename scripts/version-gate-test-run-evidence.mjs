import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/giu;
const SHA256 = /^[a-f0-9]{64}$/u;

function inside(root, candidate) {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

async function verifyV33BusinessBundle(directory, exported) {
  const failures = [];
  const run = exported.run;
  const scenario = run?.scenarioId;
  const workflowByScenario = { normal: "NORMAL_ASSERTION_VERIFIED", recovery: "RECOVERY_ASSERTION_VERIFIED", rejection: "REJECTION_ASSERTION_VERIFIED" };
  const assertionByScenario = { normal: "V3.3_NORMAL_RESULTS_001", recovery: "V3.3_CHECKPOINT_RECOVERY_001", rejection: "V3.3_REJECTION_NO_SIDE_EFFECTS" };
  if (exported.evidenceVersion !== "acceptance-export-v3-3-business-testrun-1" || exported.stageId !== "V3.3" || run?.stageId !== "V3.3" || exported.scenarioId !== scenario) failures.push("V3.3 evidence envelope or nested TestRun identity is invalid");
  if (exported.status !== "RUNNING" || run?.status !== "RUNNING" || exported.businessValidation !== "PASS" || run?.evidence?.businessValidation !== "PASS" || exported.humanAcceptance !== "NOT_RUN" || run?.evidence?.humanAcceptance !== "NOT_RUN" || run?.evidence?.workflowStep !== workflowByScenario[scenario]) failures.push("V3.3 scenario state or human acceptance markers are invalid");
  const assertionId = assertionByScenario[scenario];
  const assertion = run?.assertions?.find((item) => item?.id === assertionId);
  if (!assertionId || assertion?.status !== "PASS") failures.push("V3.3 same-TestRun scenario assertion is missing or not PASS");
  const scenarioEvidence = scenario === "normal" ? run?.evidence?.normalAssertion : scenario === "recovery" ? run?.evidence?.recoveryAssertion : run?.evidence?.rejectionAssertion;
  if (scenarioEvidence?.result !== "PASS") failures.push("V3.3 persisted scenario evidence does not report PASS");

  const descriptors = Array.isArray(exported.artifacts) ? exported.artifacts : [];
  if (scenario === "rejection") {
    const rejection = scenarioEvidence;
    if (descriptors.length !== 0 || rejection?.rejection?.status !== "REJECTED_AS_EXPECTED" || rejection?.rejection?.httpStatus !== 422 || rejection?.rejection?.reason !== "TestRun budget exhausted"
      || rejection?.noExperiment !== true || rejection?.noModelCalls !== true || rejection?.noRunnerJobs !== true
      || rejection?.budgetSummary?.totals?.experiments !== 0 || rejection?.budgetSummary?.totals?.modelCallCount !== 0 || rejection?.runnerQueue?.jobs?.length !== 0) failures.push("V3.3 rejection export does not prove the exact budget rejection and zero side effects");
    return failures;
  }

  const completed = run?.evidence?.completedRounds;
  if (!Array.isArray(completed) || completed.length !== 2 || descriptors.length !== 2) failures.push("V3.3 normal/recovery export must contain exactly two completed round outputs");
  const sorted = [...descriptors].sort((left, right) => left.roundIndex - right.roundIndex);
  for (let index = 0; index < sorted.length; index += 1) {
    const descriptor = sorted[index];
    const round = completed?.find((item) => item.roundIndex === index + 1);
    const ref = round?.artifacts?.length === 1 ? round.artifacts[0] : null;
    if (!descriptor || !ref || descriptor.roundIndex !== index + 1 || descriptor.artifactId !== ref.artifactId || descriptor.sha256 !== ref.sha256 || descriptor.namespace !== ref.namespace || descriptor.status !== "PUBLISHED"
      || descriptor.filename !== `v33-round-${index + 1}-${ref?.sha256}.json` || !/^[a-f0-9]{64}$/u.test(String(ref?.sha256))) {
      failures.push(`V3.3 round ${index + 1} Artifact descriptor is not bound to its persisted TestRun`);
      continue;
    }
    try {
      const bytes = await readFile(resolve(directory, descriptor.filename));
      if (createHash("sha256").update(bytes).digest("hex") !== ref.sha256) throw new Error("SHA-256 mismatch");
      const metrics = JSON.parse(bytes.toString("utf8"));
      if (metrics?.fixtureId !== "v3.1-research-small-sample-1" || metrics?.bars !== 6 || metrics?.qlibVersion !== "0.9.6.99" || metrics?.return !== 0.12) throw new Error("frozen Fixture metrics mismatch");
      if (scenario === "normal") {
        const output = scenarioEvidence?.outputs?.find((item) => item.roundIndex === index + 1);
        if (!output?.valid || output.artifactId !== descriptor.artifactId || output.sha256 !== ref.sha256) throw new Error("normal assertion does not reference the verified output");
      }
    } catch (error) { failures.push(`V3.3 round ${index + 1} Artifact verification failed (${error instanceof Error ? error.message : "unavailable"})`); }
  }

  if (scenario === "normal") {
    const summary = scenarioEvidence?.budgetSummary;
    const row = Array.isArray(summary?.rows) && summary.rows.length === 1 ? summary.rows[0] : null;
    if (summary?.testRunId !== exported.testRunId || summary?.totals?.experiments !== 1 || summary?.totals?.requestedCents !== 80 || summary?.totals?.reservedCents !== 0 || summary?.totals?.settledCents !== 46 || summary?.totals?.unknownReservedCents !== 0 || summary?.totals?.modelCallCount !== 2
      || row?.experimentId !== run.evidence.experiment?.experimentId || row?.rounds !== 2 || row?.requestedCents !== 80 || row?.reservedCents !== 0 || row?.settledCents !== 46 || row?.unknownReservedCents !== 0 || row?.modelCallCount !== 2 || row?.status !== "SETTLED" || !Array.isArray(row.roundBudget) || row.roundBudget.length !== 2 || row.roundBudget.some((item, index) => item.roundIndex !== index + 1 || item.allocatedCents !== 40 || item.usedCents !== 23 || item.unknownReservedCents !== 0)) failures.push("V3.3 normal export does not independently support the persisted exact settlement totals");
  } else if (scenario === "recovery") {
    const checkpoints = scenarioEvidence?.checkpointHistory?.checkpoints;
    if (!Array.isArray(checkpoints) || checkpoints.length !== 2 || checkpoints.some((item, index) => item.sequence !== index + 1 || item.state?.cursor !== index + 1 || !SHA256.test(item.stateSha256 ?? "") || createHash("sha256").update(canonicalJson(item.state)).digest("hex") !== item.stateSha256)) failures.push("V3.3 recovery export checkpoint history failed independent canonical SHA-256 verification");
    const recovery = scenarioEvidence?.resumedOutput?.recovery;
    if (recovery?.resumedFromSequence !== 1 || recovery?.checkpointSequence !== 2 || recovery?.cursor !== 2) failures.push("V3.3 recovery export resumed-output metrics are invalid");
  }
  return failures;
}

async function verifyRunBundle(root, stageId, testRunId, stagePass) {
  const failures = [];
  const directory = resolve(root, "evidence/local", stageId, testRunId);
  let resolvedDirectory;
  try {
    const info = await lstat(directory);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error("run evidence directory is not a real directory");
    resolvedDirectory = await realpath(directory);
    if (!inside(root, resolvedDirectory)) throw new Error("run evidence directory escapes the repository");
  } catch (error) {
    const missing = error && typeof error === "object" && "code" in error && error.code === "ENOENT";
    return { testRunId, status: missing ? "INCOMPLETE" : "FAIL", failures: [missing ? "structured run export is missing" : "structured run export path is invalid or unreadable"] };
  }

  const evidencePath = resolve(resolvedDirectory, "evidence.json");
  const manifestPath = resolve(resolvedDirectory, "manifest.sha256");
  let evidence;
  try {
    const info = await lstat(evidencePath);
    if (info.isSymbolicLink() || !info.isFile()) throw new Error("evidence.json is not a regular file");
    evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  } catch (error) {
    failures.push(`evidence.json is invalid (${error instanceof Error ? error.message : "unavailable"})`);
  }

  try {
    const info = await lstat(manifestPath);
    if (info.isSymbolicLink() || !info.isFile()) throw new Error("manifest.sha256 is not a regular file");
    const manifest = await readFile(manifestPath, "utf8");
    const entries = manifest.split(/\r?\n/u).filter(Boolean);
    if (entries.length === 0) throw new Error("manifest is empty");
    let evidenceEntryFound = false;
    for (const entry of entries) {
      const match = entry.match(/^([a-f0-9]{64})\s+(.+)$/u);
      if (!match) throw new Error("manifest entry is malformed");
      const [, expectedHash, relativePath] = match;
      if (relativePath.startsWith("/") || relativePath.includes("\\") || relativePath.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("manifest path is unsafe");
      const filePath = resolve(resolvedDirectory, relativePath);
      if (!inside(resolvedDirectory, filePath)) throw new Error("manifest path escapes its run directory");
      const fileInfo = await lstat(filePath);
      if (fileInfo.isSymbolicLink() || !fileInfo.isFile()) throw new Error(`manifest target is not a regular file: ${relativePath}`);
      const actualHash = createHash("sha256").update(await readFile(filePath)).digest("hex");
      if (actualHash !== expectedHash) throw new Error(`manifest hash mismatch: ${relativePath}`);
      if (relativePath === "evidence.json") evidenceEntryFound = true;
    }
    if (!evidenceEntryFound) throw new Error("manifest does not bind evidence.json");
  } catch (error) {
    failures.push(`manifest verification failed (${error instanceof Error ? error.message : "unavailable"})`);
  }

  if (evidence) {
    if (evidence.stageId !== stageId) failures.push(`export stageId mismatch (${String(evidence.stageId)})`);
    if (evidence.testRunId !== testRunId) failures.push(`export testRunId mismatch (${String(evidence.testRunId)})`);
    if (evidence.run && (evidence.run.stageId !== stageId || evidence.run.testRunId !== testRunId)) failures.push("nested TestRun identity does not match its export");
    if (stageId === "V3.3") failures.push(...await verifyV33BusinessBundle(resolvedDirectory, evidence));
    if (stagePass) {
      // Existing evidence-export v2 serializes the owner-scoped API response
      // directly (stageId/testRunId/status/assertions at the top level).
      // Also accept the explicit { run: ... } envelope used by newer exports.
      const run = evidence.run ?? evidence;
      if (run.status !== "COMPLETED") failures.push("PASS stage requires a COMPLETED structured TestRun");
      // Some historical V1.1 exports wrap the run status in `run` while keeping
      // the persisted assertion list at the envelope level. Read those two
      // fields independently; identity and status checks above still bind the
      // bundle to the requested stage and TestRun UUID.
      const assertions = Array.isArray(run.assertions) ? run.assertions : evidence.assertions;
      if (!Array.isArray(assertions) || assertions.length === 0 || assertions.some((assertion) => assertion?.status !== "PASS")) failures.push("PASS stage requires non-empty all-PASS TestRun assertions");
    }
  }
  return { testRunId, status: failures.length ? "FAIL" : "PASS", evidencePath: relative(root, evidencePath), failures };
}

export async function auditTestRunEvidence(repositoryRoot, acceptanceRows, stageRows) {
  const root = await realpath(repositoryRoot);
  const stages = new Map(stageRows.map(({ stageId, status }) => [stageId, status]));
  const results = [];
  for (const row of acceptanceRows) {
    UUID.lastIndex = 0;
    const matches = [...row.evidence.matchAll(UUID)];
    const testRunIds = [...new Set(matches
      .filter((match, index) => {
        // Acceptance rows may bind a TestRun to a separate account UUID. Do not
        // interpret an explicitly labeled account identifier as another run.
        const previousEnd = index === 0 ? 0 : matches[index - 1].index + matches[index - 1][0].length;
        const label = row.evidence.slice(previousEnd, match.index);
        return !/(?:^|\b)account(?:id)?\s*(?::|=)?\s*(?:\x60)?$/iu.test(label);
      })
      .map(([id]) => id.toLowerCase()))];
    const stageStatus = stages.get(row.stageId) ?? "";
    const stagePass = /^PASS(?:\s|\(|（|$)/u.test(stageStatus);
    const stageResults = [];
    if (testRunIds.length === 0 && stagePass) {
      stageResults.push({ status: "FAIL", failures: ["PASS stage has no exact TestRun UUID in its evidence row"] });
    }
    if (stagePass && testRunIds.length > 0 && !testRunIds.some((testRunId) => row.signoff.includes(testRunId))) {
      stageResults.push({ status: "FAIL", failures: ["dated user sign-off is not bound to an exact TestRun UUID"] });
    }
    for (const testRunId of testRunIds) stageResults.push(await verifyRunBundle(root, row.stageId, testRunId, stagePass));
    const failures = stageResults.flatMap((result) => result.failures ?? []);
    results.push({ stageId: row.stageId, testRunIds, status: stageResults.some((result) => result.status === "FAIL") ? "FAIL" : stageResults.some((result) => result.status === "INCOMPLETE") ? "INCOMPLETE" : "PASS", results: stageResults, failures });
  }
  const status = results.some((row) => row.status === "FAIL") ? "FAIL" : results.some((row) => row.status === "INCOMPLETE") ? "INCOMPLETE" : results.every((row) => row.testRunIds.length === 0) ? "NOT_RUN" : "PASS";
  return {
    status,
    stagesChecked: results.length,
    testRunIdsChecked: results.reduce((count, row) => count + row.testRunIds.length, 0),
    unresolvedAssociations: results.flatMap((row) => row.results.filter((result) => result.status !== "PASS").map((result) => ({ stageId: row.stageId, testRunId: result.testRunId ?? null, status: result.status, failures: result.failures }))),
    results,
    scope: "Checks exact TestRun UUIDs against stage-scoped structured evidence exports and their SHA-256 manifests; PASS stages additionally require completed runs, all-PASS assertions, and a UUID-bound dated user sign-off. Legacy IDs without exported bundles remain unresolved rather than being inferred as valid.",
  };
}
