import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const shanghaiDate = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date(iso));

export function summarizeObservations(observations, { subscriptionId, targetDays = 20, malformedFiles = [] } = {}) {
  if (!Number.isInteger(targetDays) || targetDays < 1) throw new Error("targetDays must be a positive integer");
  const invalidTimestampFiles = [];
  let ignoredSubscriptionCount = 0;
  const valid = [];
  for (const item of observations) {
    if (subscriptionId && item?.subscription?.subscriptionId !== subscriptionId) {
      ignoredSubscriptionCount += 1;
      continue;
    }
    if (!Number.isFinite(Date.parse(item?.capturedAt ?? ""))) {
      invalidTimestampFiles.push(item?._sourceFile ?? "<unknown>");
      continue;
    }
    valid.push(item);
  }
  // File enumeration order is not a reliable indication of observation order.
  valid.sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  const byDate = new Map();
  for (const item of valid) {
    const date = shanghaiDate(item.capturedAt);
    const current = byDate.get(date);
    const healthySnapshot = item.status === "ACTIVE" && item.runs?.total > 0 && item.runs?.total === item.runs?.completed && item.openGaps === 0 && item.pendingOutbox === 0;
    const complete = item.observationCounted === true && healthySnapshot;
    // A mid-session QUEUED run or an open gap is an in-progress observation,
    // not a failed day. Only a persisted terminal FAILED run invalidates an
    // otherwise complete day; the final snapshot still decides completeness.
    const failed = item.runs?.byStatus?.some(({ status, count }) => status === "FAILED" && Number(count) > 0);
    // A regular monitor snapshot is deliberately non-final. It must not
    // erase a completed end-of-day decision merely because it carries the
    // default observationCounted=false. Legacy snapshots have no `finalized`
    // field; treat an uncounted, otherwise-healthy snapshot as non-final while
    // retaining the ability to invalidate a day when a real gap/regression is
    // observed after the earlier PASS.
    const finalized = item.finalized === true || (item.finalized === undefined && (item.observationCounted === true || !healthySnapshot));
    const selected = current && current.finalized && !finalized ? current : {
      date,
      finalized,
      // Completeness is a property of the latest valid snapshot. Latching an
      // earlier PASS hides gaps, queued runs, or outbox work that reappears.
      complete,
      hadFailure: Boolean(current?.hadFailure || failed),
      observationCounted: item.observationCounted === true,
      capturedAt: item.capturedAt,
      status: item.status,
      // Keep the summary compact. Full window/checkpoint/source-attempt
      // details remain in the per-observation archive files.
      runs: item.runs ? {
        total: item.runs.total,
        completed: item.runs.completed,
        byStatus: item.runs.byStatus
      } : null,
      openGaps: item.openGaps,
      pendingOutbox: item.pendingOutbox
    };
    byDate.set(date, selected);
  }
  const dates = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const completedDays = dates.filter((item) => item.complete && !item.hadFailure).length;
  const recoveredDays = dates.filter((item) => item.complete && item.hadFailure).length;
  const observedDays = completedDays + recoveredDays;
  const invalidEvidence = { malformedFiles: [...malformedFiles], invalidTimestampFiles, ignoredSubscriptionCount };
  const evidenceValid = invalidEvidence.malformedFiles.length === 0 && invalidEvidence.invalidTimestampFiles.length === 0;
  return { schemaVersion: "dc08a-observation-summary-v3", subscriptionId: subscriptionId ?? null, targetDays, completedDays, recoveredDays, observedDays, remainingDays: Math.max(0, targetDays - observedDays), status: observedDays >= targetDays && evidenceValid ? "PASS" : "WAITING", invalidEvidence, dates, latest: dates.at(-1) ?? null };
}

export async function createObservationSummary({ inputDir = "evidence/dc08a", output = "evidence/dc08a/observation-summary.json", subscriptionId = process.env.DC08A_SUBSCRIPTION_ID ?? "dc08a-20260917-20-v1", targetDays = Number(process.env.DC08A_OBSERVATION_TARGET_DAYS ?? 20) } = {}) {
  const names = (await readdir(resolve(inputDir))).filter((name) => /^observation-.*\.json$/.test(name) && name !== "observation-summary.json");
  const observations = [];
  const malformedFiles = [];
  for (const name of names) {
    try { observations.push({ ...JSON.parse(await readFile(resolve(inputDir, name), "utf8")), _sourceFile: name }); }
    catch { malformedFiles.push(name); }
  }
  const summary = summarizeObservations(observations, { subscriptionId, targetDays, malformedFiles });
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(resolve(output), `${JSON.stringify(summary, null, 2)}\n`);
  return { output: resolve(output), summary };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { const result = await createObservationSummary(); console.log(JSON.stringify(result, null, 2)); process.exitCode = result.summary.status === "PASS" ? 0 : 2; }
  catch (error) { console.error(JSON.stringify({ status: "FAILED", error: String(error) })); process.exitCode = 1; }
}
