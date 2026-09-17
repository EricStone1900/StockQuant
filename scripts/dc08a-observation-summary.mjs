import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const shanghaiDate = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date(iso));

export function summarizeObservations(observations, { subscriptionId, targetDays = 20 } = {}) {
  const filtered = observations.filter((item) => !subscriptionId || item.subscription?.subscriptionId === subscriptionId);
  const byDate = new Map();
  for (const item of filtered) {
    const date = shanghaiDate(item.capturedAt);
    const current = byDate.get(date);
    const complete = item.observationCounted === true && item.status === "ACTIVE" && item.runs?.total > 0 && item.runs?.total === item.runs?.completed && item.openGaps === 0 && item.pendingOutbox === 0;
    byDate.set(date, { date, complete: Boolean(current?.complete || complete), observationCounted: Boolean(current?.observationCounted || item.observationCounted === true), capturedAt: item.capturedAt, status: item.status, runs: item.runs, openGaps: item.openGaps, pendingOutbox: item.pendingOutbox });
  }
  const dates = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const completedDays = dates.filter((item) => item.complete).length;
  return { schemaVersion: "dc08a-observation-summary-v1", subscriptionId: subscriptionId ?? null, targetDays, completedDays, remainingDays: Math.max(0, targetDays - completedDays), status: completedDays >= targetDays ? "PASS" : "WAITING", dates, latest: dates.at(-1) ?? null };
}

export async function createObservationSummary({ inputDir = "evidence/dc08a", output = "evidence/dc08a/observation-summary.json", subscriptionId = process.env.DC08A_SUBSCRIPTION_ID ?? "dc08a-20260917-20-v1", targetDays = Number(process.env.DC08A_OBSERVATION_TARGET_DAYS ?? 20) } = {}) {
  const names = (await readdir(resolve(inputDir))).filter((name) => /^observation-.*\.json$/.test(name));
  const observations = [];
  for (const name of names) { try { observations.push(JSON.parse(await readFile(resolve(inputDir, name), "utf8"))); } catch { /* retain malformed evidence for manual review */ } }
  const summary = summarizeObservations(observations, { subscriptionId, targetDays });
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(resolve(output), `${JSON.stringify(summary, null, 2)}\n`);
  return { output: resolve(output), summary };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { const result = await createObservationSummary(); console.log(JSON.stringify(result, null, 2)); process.exitCode = result.summary.status === "PASS" ? 0 : 2; }
  catch (error) { console.error(JSON.stringify({ status: "FAILED", error: String(error) })); process.exitCode = 1; }
}
