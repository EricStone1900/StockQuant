const checks = [];
export function liveQuoteFreshness(body, now = new Date(), maxAgeSeconds = 30 * 60) {
  if (body?.sourceId !== "tencent-quote" || !Array.isArray(body.securities) || body.securities.length === 0) return { ok: false, reason: "missing live quote securities" };
  const ages = body.securities.map((item) => {
    if (item?.status !== "LIVE_SOURCE" || typeof item.observedAt !== "string" || !Number.isFinite(Date.parse(item.observedAt))) return null;
    return Math.max(0, Math.floor((now.getTime() - Date.parse(item.observedAt)) / 1000));
  });
  if (ages.some((age) => age === null)) return { ok: false, reason: "quote contains non-live or malformed security" };
  const oldestAgeSeconds = Math.max(...ages);
  return { ok: oldestAgeSeconds <= maxAgeSeconds, oldestAgeSeconds, maxAgeSeconds, reason: oldestAgeSeconds <= maxAgeSeconds ? null : "quote is stale" };
}

async function check(name, url, predicate) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    const body = await response.json();
    const ok = response.ok && predicate(body);
    checks.push({ name, status: ok ? "PASS" : "FAIL", httpStatus: response.status, body });
  } catch (error) {
    checks.push({ name, status: "FAIL", error: error instanceof Error ? error.message : "unknown" });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await check("platform-ready", "http://127.0.0.1:3000/ready", (body) => body.status === "ready" && body.brokerMode === "FAKE");
  await check("market-data-ready", "http://127.0.0.1:3002/ready", (body) => body.status === "ready" && body.liveQuoteMode === "LIVE_SOURCE");
  await check("v24-scheduler", "http://127.0.0.1:3000/api/v1/acceptance/v2/v2.4/scheduler/status", (body) => body.status === "RUNNING" && body.samplingIntervalMinutes === 30 && typeof body.nextSampleAt === "string" && body.mode === "PAPER" && body.brokerMode === "FAKE");
  const cnDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  await check("a-share-calendar", `http://127.0.0.1:3002/v2/calendar/cn-a-share/${cnDate}`, (body) => ["TRADING", "CLOSED"].includes(body.status) && typeof body.calendarVersion === "string");
  await check("live-quote-probe", "http://127.0.0.1:3002/v2/quote/preview", (body) => liveQuoteFreshness(body).ok);
  console.log(JSON.stringify({ stageId: "V2.4", checks }, null, 2));
  process.exitCode = checks.every((check) => check.status === "PASS") ? 0 : 1;
}
