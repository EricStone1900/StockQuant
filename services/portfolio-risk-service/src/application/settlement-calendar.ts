import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const fixtureDirs = ["fixtures/v1/v1.4-settlement-v1.0.0", "fixtures/v1/v1.4-settlement-v1.1.0", "fixtures/v1/v1.4-settlement-v1.2.0"];

type Calendar = { fixtureId: string; fixtureVersion: string; calendarVersion: string; markets: Record<string, { currency: string; sessions: Array<{ sessionDate: string; settlementDate: string | null }> }> };

function fixtureRoot(): string {
  for (const root of [process.env.STOCKQUANT_FIXTURE_ROOT, process.cwd(), resolve(process.cwd(), "../..")].filter((item): item is string => Boolean(item))) {
    if (fixtureDirs.every((directory) => existsSync(resolve(root, directory, "settlement-calendar.json")) && existsSync(resolve(root, directory, "manifest.json")))) return root;
  }
  throw new Error("SETTLEMENT_FIXTURE_UNAVAILABLE");
}

export function assertPaperSettlement(input: { market: "CN_A" | "US_EQUITY"; currency: string; effectiveAt: string; settlement: { tradeDate: string; settlementDate: string | null; calendarVersion: string; settlementErrorCode: "SETTLEMENT_CALENDAR_UNAVAILABLE" | null } }): void {
  const root = fixtureRoot();
  let selected: Calendar | undefined;
  for (const directory of fixtureDirs) {
    const fixturePath = `${directory}/settlement-calendar.json`;
    const manifestPath = `${directory}/manifest.json`;
    const bytes = readFileSync(resolve(root, fixturePath));
    const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), "utf8")) as { fixtureId: string; fixtureVersion: string; files: Array<{ path: string; sha256: string }> };
    const calendar = JSON.parse(bytes.toString("utf8")) as Calendar;
    const record = manifest.files.find((file) => file.path === fixturePath);
    if (!record || record.sha256 !== createHash("sha256").update(bytes).digest("hex") || manifest.fixtureId !== calendar.fixtureId || manifest.fixtureVersion !== calendar.fixtureVersion) throw new Error("SETTLEMENT_FIXTURE_HASH_MISMATCH");
    if (input.settlement.calendarVersion === calendar.calendarVersion) selected = calendar;
  }
  const calendar = selected;
  if (!calendar) throw new Error("SETTLEMENT_CALENDAR_VERSION_MISMATCH");
  const market = calendar.markets[input.market];
  if (!market || market.currency !== input.currency) throw new Error("SETTLEMENT_MARKET_CURRENCY_MISMATCH");
  const zone = input.market === "CN_A" ? "Asia/Shanghai" : "America/New_York";
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(input.effectiveAt));
  if (input.settlement.tradeDate !== localDate) throw new Error("SETTLEMENT_TRADE_DATE_MISMATCH");
  const row = market.sessions.find((session) => session.sessionDate === input.settlement.tradeDate);
  if (input.settlement.settlementDate === null) {
    if (input.settlement.settlementErrorCode !== "SETTLEMENT_CALENDAR_UNAVAILABLE" || row?.settlementDate) throw new Error("SETTLEMENT_CALENDAR_UNAVAILABLE");
    return;
  }
  if (input.settlement.settlementErrorCode !== null || !row?.settlementDate) throw new Error("SETTLEMENT_CALENDAR_UNAVAILABLE");
  if (row.settlementDate !== input.settlement.settlementDate) throw new Error("SETTLEMENT_DATE_MISMATCH");
}
