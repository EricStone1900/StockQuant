import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const fixtureDirs = ["fixtures/v1/v1.4-settlement-v1.0.0", "fixtures/v1/v1.4-settlement-v1.1.0", "fixtures/v1/v1.4-settlement-v1.2.0"];
const expectedCurrencies = { CN_A: "CNY", US_EQUITY: "USD" };

export async function loadV14SettlementCalendar(root = process.cwd(), fixtureDir = fixtureDirs.at(-1)) {
  const fixturePath = `${fixtureDir}/settlement-calendar.json`;
  const manifestPath = `${fixtureDir}/manifest.json`;
  const fixture = JSON.parse(await readFile(`${root}/${fixturePath}`, "utf8"));
  const manifest = JSON.parse(await readFile(`${root}/${manifestPath}`, "utf8"));
  const bytes = await readFile(`${root}/${fixturePath}`);
  const expectedFile = manifest.files.find((file) => file.path === fixturePath);
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (!expectedFile || expectedFile.sha256 !== actualHash) throw new Error("V14_SETTLEMENT_FIXTURE_HASH_MISMATCH");
  if (fixture.fixtureId !== manifest.fixtureId || fixture.fixtureVersion !== manifest.fixtureVersion) throw new Error("V14_SETTLEMENT_FIXTURE_MANIFEST_IDENTITY_MISMATCH");
  for (const [market, currency] of Object.entries(expectedCurrencies)) {
    const entry = fixture.markets?.[market];
    if (!entry || entry.currency !== currency || !Array.isArray(entry.sessions)) throw new Error(`V14_SETTLEMENT_FIXTURE_MARKET_INVALID:${market}`);
    const dates = new Set();
    let previous = "";
    for (const row of entry.sessions) {
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(row.sessionDate) || row.sessionDate <= previous || dates.has(row.sessionDate)) throw new Error(`V14_SETTLEMENT_FIXTURE_SESSION_ORDER_INVALID:${market}`);
      previous = row.sessionDate;
      dates.add(row.sessionDate);
    }
    if (entry.sessions.at(-1)?.settlementDate !== null) throw new Error(`V14_SETTLEMENT_FIXTURE_TAIL_MUST_REMAIN_PENDING:${market}`);
    for (const row of entry.sessions) {
      if (row.settlementDate !== null && (row.settlementDate <= row.sessionDate || !dates.has(row.settlementDate))) throw new Error(`V14_SETTLEMENT_FIXTURE_MAPPING_INVALID:${market}:${row.sessionDate}`);
    }
  }
  return { fixture, manifest, sha256: actualHash };
}

export function resolveV14SettlementDate(calendar, market, tradeDate) {
  const row = calendar.markets?.[market]?.sessions?.find((session) => session.sessionDate === tradeDate);
  if (!row || !row.settlementDate) throw new Error("SETTLEMENT_CALENDAR_UNAVAILABLE");
  return { settlementDate: row.settlementDate, calendarVersion: calendar.calendarVersion };
}

export async function verifyV14SettlementCalendar(root = process.cwd()) {
  const loadedCalendars = await Promise.all(fixtureDirs.map((directory) => loadV14SettlementCalendar(root, directory)));
  for (const loaded of loadedCalendars) {
  const { fixture } = loaded;
  for (const [market, calendar] of Object.entries(fixture.markets)) {
    const mapping = resolveV14SettlementDate(fixture, market, "2024-01-05");
    if (mapping.settlementDate !== "2024-01-08") throw new Error(`V14_SETTLEMENT_WEEKEND_MAPPING_INVALID:${market}`);
    try {
      resolveV14SettlementDate(fixture, market, "2030-01-02");
      throw new Error(`V14_SETTLEMENT_UNKNOWN_DATE_ACCEPTED:${market}`);
    } catch (error) {
      if (error.message !== "SETTLEMENT_CALENDAR_UNAVAILABLE") throw error;
    }
    try {
      resolveV14SettlementDate(fixture, market, calendar.sessions.at(-1).sessionDate);
      throw new Error(`V14_SETTLEMENT_TAIL_RELEASED:${market}`);
    } catch (error) {
      if (error.message !== "SETTLEMENT_CALENDAR_UNAVAILABLE") throw error;
    }
  }
  }
  const fixtures = loadedCalendars.map(({ fixture, manifest, sha256 }) => ({ fixtureVersion: manifest.fixtureVersion, calendarVersion: fixture.calendarVersion, sha256, markets: Object.keys(fixture.markets) }));
  for (const market of Object.keys(expectedCurrencies)) {
  const extended = loadedCalendars[2].fixture.markets[market];
    if (extended.sessions.find((session) => session.sessionDate === "2026-09-25")?.settlementDate !== "2026-09-28") throw new Error(`V14_SETTLEMENT_V13_DATE_INVALID:${market}`);
  }
  const historical = loadedCalendars[2].fixture.markets.CN_A.sessions;
  for (const [tradeDate, settlementDate] of [["2023-08-25", "2023-08-28"], ["2023-08-30", "2023-08-31"]]) {
    if (resolveV14SettlementDate(loadedCalendars[2].fixture, "CN_A", tradeDate).settlementDate !== settlementDate) throw new Error(`V14_SETTLEMENT_HISTORICAL_FEE_DATE_INVALID:${tradeDate}`);
  }
  if (!historical.some((session) => session.sessionDate === "2023-08-31" && session.settlementDate === null)) throw new Error("V14_SETTLEMENT_HISTORICAL_TAIL_INVALID");
  return { status: "PASS", fixtures, checks: ["manifest hash and identity", "market/currency isolation", "strict session order", "explicit mapping target", "weekend-spanning explicit date", "V1.3 bounded dates", "unknown date fails closed", "fixture tail remains pending"] };
}

if (process.argv[1]?.endsWith("v14-settlement-calendar.mjs")) {
  verifyV14SettlementCalendar().then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
