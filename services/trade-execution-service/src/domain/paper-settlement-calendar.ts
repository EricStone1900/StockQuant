import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const fixturePath = "fixtures/v1/v1.4-settlement-v1.2.0/settlement-calendar.json";
const manifestPath = "fixtures/v1/v1.4-settlement-v1.2.0/manifest.json";
type Calendar = { fixtureId: string; fixtureVersion: string; calendarVersion: string; markets: Record<string, { currency: string; sessions: Array<{ sessionDate: string; settlementDate: string | null }> }> };

function rootPath(): string {
  for (const root of [process.env.STOCKQUANT_FIXTURE_ROOT, process.cwd(), resolve(process.cwd(), "../..")].filter((item): item is string => Boolean(item))) {
    if (existsSync(resolve(root, fixturePath)) && existsSync(resolve(root, manifestPath))) return root;
  }
  throw new Error("SETTLEMENT_FIXTURE_UNAVAILABLE");
}

/** Persist explicit settlement facts with the durable FakeBroker fill event. */
export function resolvePaperSettlement(currency: string, effectiveAt: string) {
  const root = rootPath();
  const bytes = readFileSync(resolve(root, fixturePath));
  const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), "utf8")) as { fixtureId: string; fixtureVersion: string; files: Array<{ path: string; sha256: string }> };
  const calendar = JSON.parse(bytes.toString("utf8")) as Calendar;
  const record = manifest.files.find((file) => file.path === fixturePath);
  if (!record || record.sha256 !== createHash("sha256").update(bytes).digest("hex") || manifest.fixtureId !== calendar.fixtureId || manifest.fixtureVersion !== calendar.fixtureVersion) throw new Error("SETTLEMENT_FIXTURE_HASH_MISMATCH");
  const marketId = currency === "CNY" ? "CN_A" : currency === "USD" ? "US_EQUITY" : null;
  if (!marketId) throw new Error("SETTLEMENT_MARKET_CURRENCY_MISMATCH");
  const market = calendar.markets[marketId];
  if (!market || market.currency !== currency) throw new Error("SETTLEMENT_MARKET_CURRENCY_MISMATCH");
  const instant = new Date(effectiveAt);
  if (!Number.isFinite(instant.getTime())) throw new Error("INVALID_SETTLEMENT_EFFECTIVE_AT");
  const timeZone = marketId === "CN_A" ? "Asia/Shanghai" : "America/New_York";
  const tradeDate = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
  const row = market.sessions.find((session) => session.sessionDate === tradeDate);
  if (!row?.settlementDate) return { tradeDate, settlementDate: null, calendarVersion: calendar.calendarVersion, settlementErrorCode: "SETTLEMENT_CALENDAR_UNAVAILABLE" as const };
  return { tradeDate, settlementDate: row.settlementDate, calendarVersion: calendar.calendarVersion, settlementErrorCode: null };
}
