import { activate } from "./dc08a-activate.mjs";
import { readActiveSubscription } from "./dc08a-active-subscription.mjs";
import { coverage, coverageExitCode } from "./data-coverage.mjs";
import { createDailyReport } from "./dc08a-daily-report.mjs";
import { finalReportExitCode } from "./dc08a-eod-report.mjs";
import { capture } from "./dc08a-observe.mjs";
import { drainCollectionOutbox } from "./dc08a-drain-outbox.mjs";
import { supervise } from "./dc08a-supervise.mjs";

const todayShanghai = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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
  return { status: final.state === "HEALTHY" ? "READY" : "BLOCKED", repair, activation, final, exitCode: final.exitCode };
}

export async function monitor({ recordGaps = false } = {}) {
  const readiness = await supervise({ mode: "repair" });
  if (readiness.state === "REPAIR_FAILED") return { status: "FAILED", readiness, exitCode: 1 };
  const active = await readActiveSubscription();
  const date = todayShanghai();
  const report = await coverage({ subscriptionId: active.subscriptionId, fromDate: date, toDate: date, securityIds: active.securityIds, recordGaps });
  const deliveries = await drainCollectionOutbox({ subscriptionId: active.subscriptionId });
  const observation = await capture({ subscriptionId: active.subscriptionId });
  return { status: report.report.status, readiness, active, report: report.report, deliveries, observation: observation.report, exitCode: coverageExitCode(report.report) };
}

export async function endOfDay() {
  const monitored = await monitor({ recordGaps: true });
  if (monitored.exitCode === 1) return monitored;
  const report = await createDailyReport({ subscriptionId: monitored.active.subscriptionId, securityCount: monitored.active.securityIds.length });
  return { ...monitored, dailyReport: report.report, exitCode: finalReportExitCode(report.report) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] ?? "monitor";
  try {
    const result = mode === "morning" ? await morningGuard() : mode === "eod" ? await endOfDay() : mode === "monitor" ? await monitor() : (() => { throw new Error("usage: dc08a-operations.mjs morning|monitor|eod"); })();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.exitCode;
  } catch (error) { console.error(JSON.stringify({ status: "FAILED", error: String(error) })); process.exitCode = 1; }
}
