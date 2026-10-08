import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const base = "fixtures/v1/v1.2/v1.2-market-data-4";
const csv = async (name) => {
  const lines = (await readFile(`${base}/${name}`, "utf8")).trim().split(/\r?\n/u);
  const columns = lines.shift().split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((value, index) => [columns[index], value])));
};
const manifest = JSON.parse(await readFile(`${base}/manifest.json`, "utf8"));
const securities = await csv("securities.csv");
const bars = await csv("daily_bars.csv");
const actions = await csv("corporate_actions.csv");
const future = await csv("pit_future_probe.csv");
assert.equal(manifest.fixtureVersion, "v1.2-market-data-4");
await access(resolve(base, manifest.$schema));
assert.equal(manifest.dataMode, "FIXTURE");
assert.equal(manifest.usageEligibility, "SIMULATION_ONLY");
assert.equal(manifest.source.kind, "SYNTHETIC");
assert.equal(manifest.semantics.sessions.count, 60);
assert.equal(securities.filter((row) => row.market === "CN_A").length, 10);
assert.equal(securities.filter((row) => row.market === "US_EQUITY").length, 3);
assert.equal(new Set(bars.map((row) => row.date)).size, 60);
assert.equal(new Set(bars.map((row) => row.security_id)).size, 13);
assert.equal(new Set(bars.map((row) => `${row.security_id}:${row.date}`)).size, bars.length);
for (const bar of bars) {
  assert.ok(Number(bar.low) <= Number(bar.open) && Number(bar.open) <= Number(bar.high));
  assert.ok(Number(bar.low) <= Number(bar.close) && Number(bar.close) <= Number(bar.high));
  assert.ok(Number(bar.volume) > 0);
  assert.equal(bar.adjustment, "raw");
  assert.ok(Date.parse(bar.available_at) > Date.parse(`${bar.date}T00:00:00Z`));
}
const delisted = securities.find((row) => row.delisted_at);
assert.ok(delisted);
assert.equal(bars.filter((row) => row.security_id === delisted.security_id).length, 55);
assert.equal(bars.filter((row) => row.security_id === "cn-000002").length, 59);
assert.equal(actions.length, 1);
assert.equal(actions[0].action_type, "SPLIT");
assert.equal(actions[0].semantics, "RAW_PRICE_DISCONTINUITY; action is not applied to raw OHLCV");
assert.equal(future.length, 1);
assert.ok(future[0].date > manifest.semantics.sessions.end);

// Independently derive the exact three Qlib features and next-session-close
// labels. Split each market separately, purge a boundary session, and verify
// the label barrier in actual local data-availability timestamps.
const splitRows = {};
const splitCounts = {};
for (const market of ["CN_A", "US_EQUITY"]) {
  const marketRows = [];
  for (const security of securities.filter((item) => item.market === market)) {
    const series = bars.filter((bar) => bar.security_id === security.security_id).sort((a, b) => a.date.localeCompare(b.date));
    for (let index = 20; index < series.length - 1; index += 1) {
      const window = series.slice(index - 19, index + 1);
      const current = series[index];
      const next = series[index + 1];
      const meanVolume = window.reduce((sum, item) => sum + Number(item.volume), 0) / window.length;
      const features = [Number(current.close) / Number(series[index - 20].close) - 1, Number(current.volume) / meanVolume - 1, (Number(current.high) - Number(current.low)) / Number(current.close)];
      const label = Number(next.close) / Number(current.close) - 1;
      const labelAvailableAt = new Date(next.available_at);
      assert.ok(features.every(Number.isFinite) && Number.isFinite(label));
      assert.ok(labelAvailableAt > new Date(current.available_at));
      marketRows.push({ ticker: security.ticker, date: current.date, features, label, decisionAt: current.available_at, featureAvailableAt: current.available_at, labelAvailableAt: labelAvailableAt.toISOString() });
    }
  }
  marketRows.sort((a, b) => a.date.localeCompare(b.date) || a.ticker.localeCompare(b.ticker));
  const dates = [...new Set(marketRows.map((row) => row.date))];
  const trainDateCount = Math.floor(dates.length * 0.55);
  const validDateCount = Math.floor(dates.length * 0.2);
  const validStart = dates[trainDateCount + 1];
  const validEnd = dates[trainDateCount + 1 + validDateCount];
  const testStart = dates[trainDateCount + 2 + validDateCount];
  const allValid = marketRows.filter((row) => row.date >= validStart && row.date < validEnd);
  const test = marketRows.filter((row) => row.date >= testStart);
  const validDecision = Math.min(...allValid.map((row) => Date.parse(row.decisionAt)));
  const testDecision = Math.min(...test.map((row) => Date.parse(row.decisionAt)));
  const train = marketRows.filter((row) => row.date < dates[trainDateCount] && Date.parse(row.labelAvailableAt) < validDecision);
  const valid = allValid.filter((row) => Date.parse(row.labelAvailableAt) < testDecision);
  assert.ok(train.length >= 20 && valid.length >= 5 && test.length >= 5, `${market} split is too small`);
  assert.ok(Math.max(...train.map((row) => Date.parse(row.labelAvailableAt))) < Math.min(...valid.map((row) => Date.parse(row.decisionAt))), `${market} train labels must precede validation decisions`);
  assert.ok(Math.max(...valid.map((row) => Date.parse(row.labelAvailableAt))) < Math.min(...test.map((row) => Date.parse(row.decisionAt))), `${market} validation labels must precede test decisions`);
  assert.ok(new Set([...train, ...valid, ...test].map((row) => row.label.toFixed(8))).size > 1, `${market} next-session close labels must not collapse to a constant`);
  splitRows[market] = { train, valid, test };
  splitCounts[market] = { train: train.length, valid: valid.length, test: test.length, decisionDates: dates.length, purgedBoundaryDates: 2 };
}
assert.ok(splitCounts.CN_A.train > splitCounts.US_EQUITY.train);
console.log(JSON.stringify({ status: "PASS", fixtureVersion: manifest.fixtureVersion, securities: { CN_A: 10, US_EQUITY: 3 }, bars: bars.length, splitCounts, featureNames: ["momentum_20", "volume_ratio_20", "high_low_range_ratio"], featureLookbackBars: 20, label: "next-session close / decision close - 1", purgedBoundaryDates: 2, marketSpecificTimeAxes: true, labelAvailabilityBarriers: "PASS", missingBar: true, delistedSecurity: delisted.ticker, corporateActions: actions.length, futurePitProbe: "excluded", sourceMode: "SYNTHETIC FIXTURE", marketCalendarClaim: "NONE" }));
