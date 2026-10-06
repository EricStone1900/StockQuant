import { copyFile, mkdir, open, unlink, writeFile } from "node:fs/promises";
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
const shanghaiDate = (now) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
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

function shanghaiTime(now) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  return `${parts.find((part) => part.type === "hour")?.value ?? "00"}:${parts.find((part) => part.type === "minute")?.value ?? "00"}`;
}

export function endOfDayEligibility({ now = new Date(), calendarStatus = "TRADING", notBefore = "15:15" } = {}) {
  if (calendarStatus === "CLOSED") return { eligible: false, status: "NOT_RUN", reason: "NON_TRADING_DAY", localTime: shanghaiTime(now) };
  if (calendarStatus !== "TRADING") return { eligible: false, status: "WAITING_DEPENDENCY", reason: "CALENDAR_UNAVAILABLE", localTime: shanghaiTime(now) };
  const localTime = shanghaiTime(now);
  if (localTime < notBefore) return { eligible: false, status: "WAITING_END_OF_DAY", reason: "COMPLETION_DEADLINE_NOT_REACHED", localTime, notBefore };
  return { eligible: true, status: "ELIGIBLE", localTime, notBefore };
}

async function readCalendar(date, calendarUrl) {
  try {
    const response = await fetch(`${calendarUrl}/v2/calendar/cn-a-share/${date}`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return { status: "UNAVAILABLE" };
    return await response.json();
  } catch {
    return { status: "UNAVAILABLE" };
  }
}

async function acquireEodLock(directory, date) {
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `.eod-${date}.lock`);
  try {
    const handle = await open(path, "wx");
    await handle.writeFile(`${JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() })}\n`);
    return { path, release: async () => { await handle.close(); await unlink(path).catch(() => {}); } };
  } catch (error) {
    if (error?.code === "EEXIST") return null;
    throw error;
  }
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

export async function endOfDay({ now = new Date(), calendar = null, calendarUrl = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002" } = {}) {
  const date = shanghaiDate(now);
  const day = calendar ?? await readCalendar(date, calendarUrl);
  const eligibility = endOfDayEligibility({ now, calendarStatus: day?.status });
  if (!eligibility.eligible) return { status: eligibility.status, calendar: day, eligibility, exitCode: eligibility.status === "NOT_RUN" ? 0 : 2 };
  const archiveDir = evidenceDirectory(date);
  const lock = await acquireEodLock(archiveDir, date);
  if (!lock) return { status: "WAITING_DEPENDENCY", eligibility, reason: "EOD_ALREADY_RUNNING", exitCode: 2 };
  try {
    const monitored = await monitor({ recordGaps: true });
    if (monitored.exitCode === 1) return monitored;
    const report = await createDailyReport({ date, subscriptionId: monitored.active.subscriptionId, securityCount: monitored.active.securityIds.length, calendarUrl });
    const completed = report.report.status === "PASS" && report.report.tradingDay === true;
    const counted = await capture({ subscriptionId: monitored.active.subscriptionId, archiveDir, now, observationCounted: completed, finalized: completed });
    // Refresh derived evidence only after gap reconciliation and outbox delivery.
    // This keeps the daily report, health report and observation summary on the
    // same post-recovery view while preserving the earlier evidence files.
    const health = await createHealthReport({ configuredSubscriptionId: monitored.active.subscriptionId });
    const observations = await createObservationSummary({ subscriptionId: monitored.active.subscriptionId });
    const evidence = {
      directory: archiveDir,
      observationPath: counted.archivePath,
      dailyReportPath: await archiveReport(archiveDir, report.path, "daily-report.json"),
      healthReportPath: await archiveReport(archiveDir, health.output, "health-report.json"),
      observationSummaryPath: await archiveReport(archiveDir, observations.output, "observation-summary.json")
    };
    const reportExitCode = finalReportExitCode(report.report);
    return { ...monitored, eligibility, observation: counted.report, dailyReport: report.report, health: health.report, observationSummary: observations.summary, evidence, exitCode: reportExitCode === 0 && monitored.sourceRecovery?.alert ? 2 : reportExitCode };
  } finally {
    await lock.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] ?? "monitor";
  try {
    const result = mode === "morning" ? await morningGuard() : mode === "eod" ? await endOfDay() : mode === "monitor" ? await monitor() : (() => { throw new Error("usage: dc08a-operations.mjs morning|monitor|eod"); })();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.exitCode;
  } catch (error) { console.error(JSON.stringify({ status: "FAILED", error: String(error) })); process.exitCode = 1; }
}
