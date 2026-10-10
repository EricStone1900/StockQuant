import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const base = "fixtures/v1/v1.2/v1.2-market-data-5";
const csv = async (name) => {
  const lines = (await readFile(`${base}/${name}`, "utf8")).trim().split(/\r?\n/u);
  const columns = lines.shift().split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((value, index) => [columns[index], value])));
};
const manifest = JSON.parse(await readFile(`${base}/manifest.json`, "utf8"));
const securities = await csv("securities.csv");
const bars = await csv("daily_bars.csv");
const marketSessions = await csv("market_sessions.csv");
const actions = await csv("corporate_actions.csv");
const future = await csv("pit_future_probe.csv");
assert.equal(manifest.fixtureVersion, "v1.2-market-data-5");
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
assert.equal(marketSessions.length, 120);
for (const market of ["CN_A", "US_EQUITY"]) assert.equal(new Set(marketSessions.filter((row) => row.market === market).map((row) => row.session_date)).size, 60);
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
  const sessions = marketSessions.filter((row) => row.market === market).map((row) => row.session_date).sort();
  for (const security of securities.filter((item) => item.market === market)) {
    const series = new Map(bars.filter((bar) => bar.security_id === security.security_id).map((bar) => [bar.date, bar]));
    for (let index = 20; index < sessions.length - 1; index += 1) {
      const window = sessions.slice(index - 20, index + 1).map((date) => series.get(date));
      const current = window.at(-1);
      const next = series.get(sessions[index + 1]);
      // Missing market sessions invalidate the lookback and/or target instead
      // of compressing the history and creating a false adjacent-session label.
      if (window.some((bar) => !bar) || !next) continue;
      const meanVolume = window.reduce((sum, item) => sum + Number(item.volume), 0) / window.length;
      const features = [Number(current.close) / Number(window[0].close) - 1, Number(current.volume) / meanVolume - 1, (Number(current.high) - Number(current.low)) / Number(current.close)];
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
const cnSessions = marketSessions.filter((row) => row.market === "CN_A").map((row) => row.session_date).sort();
const missingSecurityRows = new Map(bars.filter((bar) => bar.security_id === "cn-000002").map((bar) => [bar.date, bar]));
const missingSessionIndex = cnSessions.findIndex((date) => !missingSecurityRows.has(date));
assert.notEqual(missingSessionIndex, -1, "frozen missing-bar case must remain present");
const missingWindowDecisions = new Set(cnSessions.slice(missingSessionIndex - 1, missingSessionIndex + 21));
assert.ok(!splitRows.CN_A.train.concat(splitRows.CN_A.valid, splitRows.CN_A.test).some((row) => row.ticker === securities.find((item) => item.security_id === "cn-000002").ticker && missingWindowDecisions.has(row.date)), "missing bar must invalidate its lookback and next-session label window");
assert.ok(splitRows.CN_A.train.concat(splitRows.CN_A.valid, splitRows.CN_A.test).some((row) => row.ticker === securities.find((item) => item.security_id === "cn-000002").ticker && row.date === cnSessions[missingSessionIndex + 21]), "rows resume after the missing session leaves the 20-bar lookback");
const wholeMarketMissingDate = cnSessions[30];
const barsWithoutCnSession = bars.filter((bar) => !(bar.market === "CN_A" && bar.date === wholeMarketMissingDate));
const wholeMarketMissingIndex = cnSessions.indexOf(wholeMarketMissingDate);
const wholeMarketAffectedDates = new Set(cnSessions.slice(wholeMarketMissingIndex - 1, wholeMarketMissingIndex + 21));
for (const security of securities.filter((item) => item.market === "CN_A")) {
  const series = new Map(barsWithoutCnSession.filter((bar) => bar.security_id === security.security_id).map((bar) => [bar.date, bar]));
  const validDecisionDates = [];
  for (let index = 20; index < cnSessions.length - 1; index += 1) {
    const window = cnSessions.slice(index - 20, index + 1).map((date) => series.get(date));
    if (!window.some((bar) => !bar) && series.has(cnSessions[index + 1])) validDecisionDates.push(cnSessions[index]);
  }
  assert.ok(!validDecisionDates.some((date) => wholeMarketAffectedDates.has(date)), `${security.ticker} must not bridge a whole-market missing session`);
  assert.ok(validDecisionDates.includes(cnSessions[wholeMarketMissingIndex + 21]), `${security.ticker} rows must recover after the gap leaves lookback`);
}
assert.ok(splitCounts.CN_A.train > splitCounts.US_EQUITY.train);
console.log(JSON.stringify({ status: "PASS", fixtureVersion: manifest.fixtureVersion, securities: { CN_A: 10, US_EQUITY: 3 }, bars: bars.length, expectedMarketSessions: marketSessions.length, splitCounts, featureNames: ["momentum_20", "volume_ratio_20", "high_low_range_ratio"], featureLookbackBars: 20, label: "next-session close / decision close - 1", purgedBoundaryDates: 2, marketSpecificTimeAxes: true, labelAvailabilityBarriers: "PASS", missingBar: true, wholeMarketMissingSession: true, delistedSecurity: delisted.ticker, corporateActions: actions.length, futurePitProbe: "excluded", sourceMode: "SYNTHETIC FIXTURE", marketCalendarClaim: "SYNTHETIC ONLY; NO EXCHANGE-HOLIDAY CLAIM" }));
