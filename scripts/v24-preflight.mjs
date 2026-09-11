const checks = [];

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

await check("platform-ready", "http://127.0.0.1:3000/ready", (body) => body.status === "ready" && body.brokerMode === "FAKE");
await check("market-data-ready", "http://127.0.0.1:3002/ready", (body) => body.status === "ready" && body.liveQuoteMode === "LIVE_SOURCE");
await check("v24-scheduler", "http://127.0.0.1:3000/api/v1/acceptance/v2/v2.4/scheduler/status", (body) => body.status === "RUNNING" && body.samplingIntervalMinutes === 30 && typeof body.nextSampleAt === "string" && body.mode === "PAPER" && body.brokerMode === "FAKE");
const cnDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
await check("a-share-calendar", `http://127.0.0.1:3002/v2/calendar/cn-a-share/${cnDate}`, (body) => ["TRADING", "CLOSED"].includes(body.status) && typeof body.calendarVersion === "string");
await check("live-quote-probe", "http://127.0.0.1:3002/v2/quote/preview", (body) => body.sourceId === "tencent-quote" && Array.isArray(body.securities) && body.securities.length > 0 && body.securities.every((item) => item.status === "LIVE_SOURCE"));

console.log(JSON.stringify({ stageId: "V2.4", checks }, null, 2));
process.exit(checks.every((check) => check.status === "PASS") ? 0 : 1);
