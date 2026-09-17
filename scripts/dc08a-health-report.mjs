import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export function buildHealthReport({ capturedAt, ready, scheduler, activeSubscription }) {
  const healthy = ready?.status === "ready" && ready.collectionPersistence === "POSTGRES" && ready.collectionSchedulerWorker === "ENABLED" && ready.collectionExecutor === "ENABLED" && scheduler?.status === "ENABLED";
  return { schemaVersion: "dc08a-health-v1", capturedAt, status: healthy ? "HEALTHY" : "UNHEALTHY", activeSubscription, ready: { status: ready?.status ?? "UNAVAILABLE", persistence: ready?.collectionPersistence ?? null, scheduler: ready?.collectionSchedulerWorker ?? null, executor: ready?.collectionExecutor ?? null }, scheduler: { status: scheduler?.status ?? "UNAVAILABLE", lastSuccessfulTickAt: scheduler?.lastSuccessfulTickAt ?? null, nextExecutionAt: scheduler?.nextExecutionAt ?? null, lastSubmitted: Number(scheduler?.lastSubmitted ?? 0) }, checks: { recentSuccessRecorded: Boolean(scheduler?.lastSuccessfulTickAt), nextTriggerRecorded: Boolean(scheduler?.nextExecutionAt) || scheduler?.nextExecutionAt === null } };
}

export async function createHealthReport({ baseUrl = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002", activeSubscription, output = "evidence/dc08a/health-report.json" } = {}) {
  const [readyResponse, schedulerResponse] = await Promise.all([fetch(`${baseUrl}/ready`, { signal: AbortSignal.timeout(3000) }), fetch(`${baseUrl}/v2/collection-scheduler/status`, { signal: AbortSignal.timeout(3000) })]);
  const report = buildHealthReport({ capturedAt: new Date().toISOString(), ready: await readyResponse.json(), scheduler: await schedulerResponse.json(), activeSubscription });
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(resolve(output), `${JSON.stringify(report, null, 2)}\n`);
  return { output: resolve(output), report };
}

if (import.meta.url === `file://${process.argv[1]}`) { try { const result = await createHealthReport(); console.log(JSON.stringify(result, null, 2)); process.exitCode = result.report.status === "HEALTHY" ? 0 : 1; } catch (error) { console.error(JSON.stringify({ status: "FAILED", error: String(error) })); process.exitCode = 1; } }
