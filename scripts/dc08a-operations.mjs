import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { activate } from "./dc08a-activate.mjs";
import { readActiveSubscription } from "./dc08a-active-subscription.mjs";
import { coverage, coverageExitCode } from "./data-coverage.mjs";
import { createDailyReport } from "./dc08a-daily-report.mjs";
import { finalReportExitCode } from "./dc08a-eod-report.mjs";
import { capture } from "./dc08a-observe.mjs";
import { drainCollectionOutbox } from "./dc08a-drain-outbox.mjs";
import { supervise } from "./dc08a-supervise.mjs";
import { createHealthReport } from "./dc08a-health-report.mjs";
import { createObservationSummary } from "./dc08a-observation-summary.mjs";
import { probeSourceRecovery } from "./dc08a-source-recovery-probe.mjs";

const todayShanghai = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
const evidenceDirectory = (date) => resolve(process.env.DC08A_OUTPUT_DIR ?? "evidence/dc08a", "dc-t19", date);
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function writeEvidenceJson(directory, name, value) {
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, name);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
  return path;
}

async function archiveReport(directory, sourcePath, name) {
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, name);
  await copyFile(sourcePath, path);
  return path;
}

export function classifySourceRecovery(probe) {
  const failed = probe?.status === "FAILED" || probe?.attempts?.some((attempt) => attempt?.status === "FAIL");
  return { status: failed ? "DEGRADED" : "CHECKED", alert: failed, attempts: probe?.attempts ?? [] };
}

async function waitForHealthy(attempts = 20) {
  let final = await supervise({ mode: "check-only" });
  for (let attempt = 1; final.state === "UNHEALTHY" && attempt < attempts; attempt += 1) {
    await sleep(1_000);
    final = await supervise({ mode: "check-only" });
  }
  return final;
}

export async function morningGuard() {
  const repair = await supervise({ mode: "repair" });
  if (repair.state === "REPAIR_FAILED") return { status: "FAILED", repair, exitCode: 1 };
  const check = await activate({ dryRun: true });
  const activation = check.status === "READY_TO_ENABLE" ? await activate() : check;
  const final = await waitForHealthy();
  const ok = activation.exitCode === 0 && final.state === "HEALTHY";
  const result = { status: ok ? "READY" : "BLOCKED", repair, activation, final, exitCode: ok ? 0 : (activation.exitCode || final.exitCode || 2) };
  result.evidencePath = await writeEvidenceJson(evidenceDirectory(todayShanghai()), "morning.json", result);
  return result;
}

export async function monitor({ recordGaps = false } = {}) {
  const readiness = await supervise({ mode: "repair" });
  if (readiness.state === "REPAIR_FAILED") return { status: "FAILED", readiness, exitCode: 1 };
  const active = await readActiveSubscription();
  const date = todayShanghai();
  const archiveDir = evidenceDirectory(date);
  const recoveryProbe = await probeSourceRecovery({ securityIds: active.securityIds, today: todayShanghai() });
  const recoveryProbeEvidence = await writeEvidenceJson(archiveDir, `source-recovery-probe-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, recoveryProbe);
  const sourceRecovery = classifySourceRecovery(recoveryProbe);
  const recoveryFailures = sourceRecovery.alert;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", hour12: false }).format(new Date()));
  if (!recordGaps && hour >= 18) return { status: "QUIET_AFTER_CLOSE", readiness, active, recoveryProbe, recoveryProbeEvidence, sourceRecovery, exitCode: recoveryFailures ? 2 : 0 };
  const report = await coverage({ subscriptionId: active.subscriptionId, fromDate: date, toDate: date, securityIds: active.securityIds, recordGaps });
  const deliveries = await drainCollectionOutbox({ subscriptionId: active.subscriptionId });
  const observation = await capture({ subscriptionId: active.subscriptionId, archiveDir });
  const exitCode = recoveryFailures ? 2 : coverageExitCode(report.report);
  return { status: report.report.status, readiness, active, report: report.report, deliveries, observation: observation.report, recoveryProbe, recoveryProbeEvidence, sourceRecovery, evidence: { directory: archiveDir, observationPath: observation.archivePath }, exitCode };
}

export async function endOfDay() {
  const monitored = await monitor({ recordGaps: true });
  if (monitored.exitCode === 1) return monitored;
  const archiveDir = evidenceDirectory(todayShanghai());
  const report = await createDailyReport({ subscriptionId: monitored.active.subscriptionId, securityCount: monitored.active.securityIds.length });
  const counted = await capture({ subscriptionId: monitored.active.subscriptionId, archiveDir, observationCounted: report.report.status === "PASS" && report.report.tradingDay === true, finalized: true });
  // Refresh derived evidence only after gap reconciliation and outbox delivery.
  // This keeps the daily report, health report and observation summary on the
  // same post-recovery view while preserving the earlier evidence files.
  const health = await createHealthReport({ activeSubscription: monitored.active.subscriptionId });
  const observations = await createObservationSummary({ subscriptionId: monitored.active.subscriptionId });
  const evidence = {
    directory: archiveDir,
    observationPath: counted.archivePath,
    dailyReportPath: await archiveReport(archiveDir, report.path, "daily-report.json"),
    healthReportPath: await archiveReport(archiveDir, health.output, "health-report.json"),
    observationSummaryPath: await archiveReport(archiveDir, observations.output, "observation-summary.json")
  };
  const reportExitCode = finalReportExitCode(report.report);
  return { ...monitored, observation: counted.report, dailyReport: report.report, health: health.report, observationSummary: observations.summary, evidence, exitCode: reportExitCode === 0 && monitored.sourceRecovery?.alert ? 2 : reportExitCode };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] ?? "monitor";
  try {
    const result = mode === "morning" ? await morningGuard() : mode === "eod" ? await endOfDay() : mode === "monitor" ? await monitor() : (() => { throw new Error("usage: dc08a-operations.mjs morning|monitor|eod"); })();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.exitCode;
  } catch (error) { console.error(JSON.stringify({ status: "FAILED", error: String(error) })); process.exitCode = 1; }
}
