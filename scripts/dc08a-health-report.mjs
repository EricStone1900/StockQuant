import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { platformMarketDataHeaders } from "./market-data-service-identity.mjs";

function localMinutes(now) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 + Number(parts.find((part) => part.type === "minute")?.value ?? 0);
}

function clockMinutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function sourceFreshnessWindow(calendar, now, completionGraceSeconds = 300) {
  if (calendar?.status !== "TRADING" && calendar?.status !== "CLOSED") return { expected: true, state: "CALENDAR_UNAVAILABLE" };
  if (calendar.status === "CLOSED") return { expected: false, state: "MARKET_CLOSED" };
  const localTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  if (!Array.isArray(calendar.sessions) || calendar.sessions.length === 0) return { expected: true, state: "SESSION_UNAVAILABLE" };
  if (calendar.sessions.some(({ start, end }) => !/^\d{2}:\d{2}$/.test(start ?? "") || !/^\d{2}:\d{2}$/.test(end ?? ""))) return { expected: true, state: "SESSION_INVALID" };
  const nowMinutes = localMinutes(now);
  const sessions = calendar.sessions.map(({ start, end }) => ({ start, end, startMinutes: clockMinutes(start), endMinutes: clockMinutes(end) }));
  for (const session of sessions) {
    if (nowMinutes < session.startMinutes) return { expected: false, state: "WAITING_SESSION", localTime };
    const firstCompletionDeadline = session.startMinutes + 5 + Math.ceil(completionGraceSeconds / 60);
    if (nowMinutes < firstCompletionDeadline) return { expected: false, state: "WAITING_INITIAL_WINDOW", localTime };
    if (nowMinutes <= session.endMinutes + 30) return { expected: true, state: "REQUIRED", localTime };
  }
  return { expected: false, state: "AFTER_CLOSE", localTime };
}

export function buildHealthReport({ capturedAt, ready, scheduler, configuredSubscriptionId, enabledSubscriptionCount = null, sources = [], quality = {}, calendar, now = new Date(capturedAt), maxTickAgeSeconds = 1800, maxSourceAgeSeconds = 1800, completionGraceSeconds = 300 }) {
  const tickAgeSeconds = scheduler?.lastSuccessfulTickAt ? Math.max(0, (now.getTime() - Date.parse(scheduler.lastSuccessfulTickAt)) / 1000) : null;
  const recent = tickAgeSeconds !== null && tickAgeSeconds <= maxTickAgeSeconds;
  // A configured primary may be OPEN while the persisted fallback is healthy;
  // collection readiness requires at least one actually usable minute source.
  const freshnessWindow = sourceFreshnessWindow(calendar, now, completionGraceSeconds);
  const freshnessExpected = freshnessWindow.expected;
  const sourceReady = sources.length > 0 && sources.some((source) => {
    if (source.status === "PASS" || source.circuit === "HEALTHY") return true;
    if (source.circuit !== "CLOSED") return false;
    if (source.lastSuccessAt === undefined || source.lastSuccessAt === null) return false;
    const timestamp = typeof source.lastSuccessAt === "number" ? source.lastSuccessAt * 1000 : Date.parse(String(source.lastSuccessAt));
    return Number.isFinite(timestamp) && (!freshnessExpected || now.getTime() - timestamp <= maxSourceAgeSeconds * 1000);
  });
  const qualityKnown = quality.openGaps !== undefined && quality.pendingOutbox !== undefined;
  const qualityReady = qualityKnown && Number(quality.openGaps) === 0 && Number(quality.pendingOutbox) === 0;
  const sourceAuthorization = ready?.collectionSourceAuthorization ?? "UNKNOWN";
  const sourceAuthorizationAuthorized = sourceAuthorization === "AUTHORIZED";
  const nextTrigger = Boolean(scheduler?.nextExecutionAt && Date.parse(scheduler.nextExecutionAt) > now.getTime());
  const subscriptionReady = Number.isSafeInteger(enabledSubscriptionCount) && enabledSubscriptionCount === 1;
  const healthy = ready?.status === "ready" && ready.collectionPersistence === "POSTGRES" && ready.collectionSchedulerWorker === "ENABLED" && ready.collectionExecutor === "ENABLED" && sourceAuthorizationAuthorized && scheduler?.status === "ENABLED" && recent && nextTrigger && sourceReady && qualityReady && subscriptionReady;
  return { schemaVersion: "dc08a-health-v6", capturedAt, status: healthy ? "HEALTHY" : "UNHEALTHY", configuredSubscriptionId: configuredSubscriptionId ?? null, subscriptions: { enabledCount: Number.isSafeInteger(enabledSubscriptionCount) ? enabledSubscriptionCount : null, expectedEnabledCount: 1 }, calendar: { status: calendar?.status ?? "UNAVAILABLE", calendarVersion: calendar?.calendarVersion ?? null, sourceFreshnessExpected: freshnessExpected, sourceFreshnessState: freshnessWindow.state }, ready: { status: ready?.status ?? "UNAVAILABLE", persistence: ready?.collectionPersistence ?? null, scheduler: ready?.collectionSchedulerWorker ?? null, executor: ready?.collectionExecutor ?? null, sourceAuthorization }, scheduler: { status: scheduler?.status ?? "UNAVAILABLE", lastSuccessfulTickAt: scheduler?.lastSuccessfulTickAt ?? null, nextExecutionAt: scheduler?.nextExecutionAt ?? null, lastSubmitted: Number(scheduler?.lastSubmitted ?? 0), tickAgeSeconds: tickAgeSeconds === null ? null : Number(tickAgeSeconds.toFixed(3)) }, sources, quality: { openGaps: qualityKnown ? Number(quality.openGaps) : null, pendingOutbox: qualityKnown ? Number(quality.pendingOutbox) : null }, checks: { recentSuccessRecorded: recent, nextTriggerRecorded: Boolean(nextTrigger), enabledSubscriptionCountValid: subscriptionReady, sourceAuthorizationAuthorized, sourceReady, qualityReady } };
}

export async function createHealthReport({ baseUrl = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002", configuredSubscriptionId = process.env.DC08A_SUBSCRIPTION_ID ?? "dc08a-20260917-20-v1", output = "evidence/dc08a/health-report.json", fetchImpl = fetch, headers = platformMarketDataHeaders(), now = new Date() } = {}) {
  const capturedAt = now.toISOString();
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
  const [readyResponse, schedulerResponse, sourcesResponse, qualityResponse, calendarResponse, schedulesResponse] = await Promise.all([fetchImpl(`${baseUrl}/ready`, { signal: AbortSignal.timeout(3000) }), fetchImpl(`${baseUrl}/v2/collection-scheduler/status`, { headers, signal: AbortSignal.timeout(3000) }), fetchImpl(`${baseUrl}/v2/minute/sources`, { headers, signal: AbortSignal.timeout(3000) }), fetchImpl(`${baseUrl}/v2/collection/health?subscriptionId=${encodeURIComponent(configuredSubscriptionId)}`, { headers, signal: AbortSignal.timeout(3000) }), fetchImpl(`${baseUrl}/v2/calendar/cn-a-share/${localDate}`, { signal: AbortSignal.timeout(3000) }).catch(() => null), fetchImpl(`${baseUrl}/v2/collection-schedules`, { headers, signal: AbortSignal.timeout(3000) }).catch(() => null)]);
  const quality = qualityResponse.ok ? await qualityResponse.json() : {};
  const calendar = calendarResponse?.ok ? await calendarResponse.json() : { status: "UNAVAILABLE" };
  let enabledSubscriptionCount = null;
  if (schedulesResponse?.ok) {
    try {
      const scheduleBody = await schedulesResponse.json();
      if (scheduleBody && typeof scheduleBody === "object" && !Array.isArray(scheduleBody) && Array.isArray(scheduleBody.schedules)) enabledSubscriptionCount = scheduleBody.schedules.filter((schedule) => schedule?.enabled === true).length;
    } catch {
      // Keep the count unknown; an unreadable schedule inventory must fail closed.
    }
  }
  const report = buildHealthReport({ capturedAt, ready: await readyResponse.json(), scheduler: await schedulerResponse.json(), sources: (await sourcesResponse.json()).sources ?? [], configuredSubscriptionId, enabledSubscriptionCount, quality, calendar });
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(resolve(output), `${JSON.stringify(report, null, 2)}\n`);
  return { output: resolve(output), report };
}

if (import.meta.url === `file://${process.argv[1]}`) { try { const result = await createHealthReport(); console.log(JSON.stringify(result, null, 2)); process.exitCode = result.report.status === "HEALTHY" ? 0 : 1; } catch (error) { console.error(JSON.stringify({ status: "FAILED", error: String(error) })); process.exitCode = 1; } }
