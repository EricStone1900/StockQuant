const baseUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
const sizes = [50, 80, 100];
const request = async (path, init) => {
  const response = await fetch(`${baseUrl}${path}`, { ...init, signal: AbortSignal.timeout(30_000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(body)}`);
  return body;
};

const original = await request("/v2/watchlist");
const results = [];
try {
  for (const size of sizes) {
    const securities = Array.from({ length: size }, (_, index) => `${String(600000 + index).padStart(6, "0")}.SH`);
    const started = performance.now();
    const updated = await request("/v2/watchlist", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ securities }) });
    const snapshot = await request("/v2/quote/preview");
    const elapsedMs = Math.round(performance.now() - started);
    const statuses = Array.isArray(snapshot.securities) ? [...new Set(snapshot.securities.map((item) => item.status))] : [];
    results.push({ size, configuredCount: updated.count, sampledCount: snapshot.count, elapsedMs, statuses, max: updated.max, pass: updated.count === size && snapshot.count === size && updated.max === 100 });
  }
} finally {
  await request("/v2/watchlist", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ securities: original.securities }) });
}

const result = { stageId: "V2.5", test: "mac-monitor-pool-capacity", host: process.platform, architecture: process.arch, sizes, results, restoredCount: original.count, source: "tencent-quote", dataMode: "LIVE_SOURCE", note: "This measures the online watchlist/quote path only; it is not historical full-market capacity evidence." };
console.log(JSON.stringify(result, null, 2));
process.exit(results.every((item) => item.pass) ? 0 : 1);
