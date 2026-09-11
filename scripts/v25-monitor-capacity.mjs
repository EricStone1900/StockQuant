const baseUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
const sizes = [50, 80, 100];
const request = async (path, init) => {
  const response = await fetch(`${baseUrl}${path}`, { ...init, signal: AbortSignal.timeout(30_000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(body)}`);
  return body;
};

const candidateCodes = [
  ["SH", 600000, 601999], ["SH", 603000, 603999], ["SH", 605000, 605999], ["SH", 688000, 688999],
  ["SZ", 1, 3999], ["SZ", 300000, 301999]
].flatMap(([market, first, last]) => Array.from({ length: last - first + 1 }, (_, index) => `${String(first + index).padStart(6, "0")}.${market}`));

const discoverLiveUniverse = async (minimum) => {
  const live = [];
  for (let offset = 0; offset < candidateCodes.length && live.length < minimum; offset += 100) {
    const securities = candidateCodes.slice(offset, offset + 100);
    await request("/v2/watchlist", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ securities }) });
    const snapshot = await request("/v2/quote/preview");
    for (const item of snapshot.securities ?? []) {
      if (item.status === "LIVE_SOURCE" && !live.includes(item.symbol)) live.push(item.symbol);
    }
  }
  if (live.length < minimum) throw new Error(`live source universe has only ${live.length} securities; ${minimum} required`);
  return live;
};

const original = await request("/v2/watchlist");
const results = [];
try {
  const liveUniverse = await discoverLiveUniverse(100);
  for (const size of sizes) {
    const securities = liveUniverse.slice(0, size);
    const started = performance.now();
    const updated = await request("/v2/watchlist", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ securities }) });
    const snapshot = await request("/v2/quote/preview");
    const elapsedMs = Math.round(performance.now() - started);
    const statuses = Array.isArray(snapshot.securities) ? [...new Set(snapshot.securities.map((item) => item.status))] : [];
    const liveCount = Array.isArray(snapshot.securities) ? snapshot.securities.filter((item) => item.status === "LIVE_SOURCE").length : 0;
    results.push({ size, configuredCount: updated.count, sampledCount: snapshot.count, liveCount, elapsedMs, statuses, max: updated.max, pass: updated.count === size && snapshot.count === size && liveCount === size && updated.max === 100 });
  }
} finally {
  await request("/v2/watchlist", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ securities: original.securities }) });
}

const result = { stageId: "V2.5", test: "mac-monitor-pool-capacity", host: process.platform, architecture: process.arch, sizes, results, restoredCount: original.count, source: "tencent-quote", dataMode: "LIVE_SOURCE", note: "This measures the online watchlist/quote path only; it is not historical full-market capacity evidence." };
console.log(JSON.stringify(result, null, 2));
process.exit(results.every((item) => item.pass) ? 0 : 1);
