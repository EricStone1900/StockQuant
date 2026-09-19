import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export function buildHealthReport({ capturedAt, ready, scheduler, activeSubscription, sources = [], quality = {}, now = new Date(capturedAt), maxTickAgeSeconds = 1800 }) {
  const tickAgeSeconds = scheduler?.lastSuccessfulTickAt ? Math.max(0, (now.getTime() - Date.parse(scheduler.lastSuccessfulTickAt)) / 1000) : null;
  const recent = tickAgeSeconds !== null && tickAgeSeconds <= maxTickAgeSeconds;
  // A configured primary may be OPEN while the persisted fallback is healthy;
  // collection readiness requires at least one actually usable minute source.
  const sourceReady = sources.length > 0 && sources.some((source) => {
    if (source.status === "PASS" || source.circuit === "HEALTHY") return true;
    if (source.circuit !== "CLOSED") return false;
    if (source.lastSuccessAt === undefined || source.lastSuccessAt === null) return false;
    const timestamp = typeof source.lastSuccessAt === "number" ? source.lastSuccessAt * 1000 : Date.parse(String(source.lastSuccessAt));
    return Number.isFinite(timestamp) && now.getTime() - timestamp <= maxTickAgeSeconds * 1000;
  });
  const qualityKnown = quality.openGaps !== undefined && quality.pendingOutbox !== undefined;
  const qualityReady = qualityKnown && Number(quality.openGaps) === 0 && Number(quality.pendingOutbox) === 0;
  const nextTrigger = Boolean(scheduler?.nextExecutionAt && Date.parse(scheduler.nextExecutionAt) > now.getTime());
  const healthy = ready?.status === "ready" && ready.collectionPersistence === "POSTGRES" && ready.collectionSchedulerWorker === "ENABLED" && ready.collectionExecutor === "ENABLED" && scheduler?.status === "ENABLED" && recent && nextTrigger && sourceReady && qualityReady;
  return { schemaVersion: "dc08a-health-v2", capturedAt, status: healthy ? "HEALTHY" : "UNHEALTHY", activeSubscription: activeSubscription ?? null, ready: { status: ready?.status ?? "UNAVAILABLE", persistence: ready?.collectionPersistence ?? null, scheduler: ready?.collectionSchedulerWorker ?? null, executor: ready?.collectionExecutor ?? null }, scheduler: { status: scheduler?.status ?? "UNAVAILABLE", lastSuccessfulTickAt: scheduler?.lastSuccessfulTickAt ?? null, nextExecutionAt: scheduler?.nextExecutionAt ?? null, lastSubmitted: Number(scheduler?.lastSubmitted ?? 0), tickAgeSeconds: tickAgeSeconds === null ? null : Number(tickAgeSeconds.toFixed(3)) }, sources, quality: { openGaps: qualityKnown ? Number(quality.openGaps) : null, pendingOutbox: qualityKnown ? Number(quality.pendingOutbox) : null }, checks: { recentSuccessRecorded: recent, nextTriggerRecorded: Boolean(nextTrigger), sourceReady, qualityReady } };
}

export async function createHealthReport({ baseUrl = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002", activeSubscription = process.env.DC08A_SUBSCRIPTION_ID ?? "dc08a-20260917-20-v1", output = "evidence/dc08a/health-report.json" } = {}) {
  const [readyResponse, schedulerResponse, sourcesResponse, qualityResponse] = await Promise.all([fetch(`${baseUrl}/ready`, { signal: AbortSignal.timeout(3000) }), fetch(`${baseUrl}/v2/collection-scheduler/status`, { signal: AbortSignal.timeout(3000) }), fetch(`${baseUrl}/v2/minute/sources`, { signal: AbortSignal.timeout(3000) }), fetch(`${baseUrl}/v2/collection/health?subscriptionId=${encodeURIComponent(activeSubscription)}`, { signal: AbortSignal.timeout(3000) })]);
  const quality = qualityResponse.ok ? await qualityResponse.json() : {};
  const report = buildHealthReport({ capturedAt: new Date().toISOString(), ready: await readyResponse.json(), scheduler: await schedulerResponse.json(), sources: (await sourcesResponse.json()).sources ?? [], activeSubscription, quality });
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(resolve(output), `${JSON.stringify(report, null, 2)}\n`);
  return { output: resolve(output), report };
}

if (import.meta.url === `file://${process.argv[1]}`) { try { const result = await createHealthReport(); console.log(JSON.stringify(result, null, 2)); process.exitCode = result.report.status === "HEALTHY" ? 0 : 1; } catch (error) { console.error(JSON.stringify({ status: "FAILED", error: String(error) })); process.exitCode = 1; } }
