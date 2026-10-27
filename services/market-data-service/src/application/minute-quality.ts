export type QualityBar = {
  securityId: string;
  barStart: string;
  barEnd: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number | null;
  tradingStatus?: "TRADING" | "SUSPENDED" | "UNKNOWN";
  tradingStatusReference?: string | null;
  limitPriceReference?: { status: "AVAILABLE" | "NOT_APPLICABLE" | "UNKNOWN"; upperLimit: number | null; lowerLimit: number | null; marketRuleSetVersion: string | null; sourceReference: string | null };
};

export type QualityIssue = { code: "DUPLICATE_CONFLICT" | "OHLC_INVALID" | "NON_TRADING_SESSION" | "UNIT_INVALID" | "NON_FINITE" | "AMOUNT_UNAVAILABLE" | "INVALID_TRADING_STATUS_EVIDENCE" | "BAR_PRESENT_WHILE_SUSPENDED" | "LIMIT_PRICE_BREACH"; securityId: string; barStart: string };
import type { GapRecord } from "../domain/coverage.js";
export type { GapRecord } from "../domain/coverage.js";
export type TradingStatusEvidence = { securityId: string; barStart: string; barEnd: string; status: "TRADING" | "SUSPENDED"; sourceReference: string };
export type CoverageReport = { status: "PASS" | "INCOMPLETE" | "WAITING_DEPENDENCY"; expectedBars: number; validBars: number; missingBars: number; unknownBars: number; suspendedBars: number; duplicateBars: number; barStatuses: Array<{ securityId: string; barStart: string; barEnd: string; status: "PRESENT" | "MISSING" | "UNKNOWN" | "SUSPENDED"; sourceReference?: string }>; issues: QualityIssue[]; gaps: GapRecord[]; coveredTradingDates: number; requiredTradingDates: number };
export type TradingCalendar = { session(date: string): { status: "TRADING" | "CLOSED" | "UNKNOWN"; sessions?: Array<{ start: string; end: string }> } };

const OFFSET_MINUTES = 480;
const SHANGHAI_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false });
const asUtc = (date: string, time: string): Date => { const [hours, minutes] = time.split(":").map(Number); return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), hours, minutes - OFFSET_MINUTES)); };
const iso = (value: Date): string => value.toISOString();
const plusMinutes = (value: Date, minutes: number): Date => new Date(value.getTime() + minutes * 60_000);
const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);
const localTime = (value: string): string => SHANGHAI_TIME_FORMATTER.format(new Date(value));

export function validateBars(bars: QualityBar[], requireAmount = true): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const seen = new Set<string>();
  for (const bar of bars) {
    const key = `${bar.securityId}|${bar.barStart}`;
    if (seen.has(key)) issues.push({ code: "DUPLICATE_CONFLICT", securityId: bar.securityId, barStart: bar.barStart });
    seen.add(key);
    const values = [bar.open, bar.high, bar.low, bar.close, bar.volume, bar.amount ?? 0];
    if (values.some((value) => !Number.isFinite(value))) issues.push({ code: "NON_FINITE", securityId: bar.securityId, barStart: bar.barStart });
    if (!(bar.high >= bar.low && bar.high >= bar.open && bar.high >= bar.close && bar.low <= bar.open && bar.low <= bar.close)) issues.push({ code: "OHLC_INVALID", securityId: bar.securityId, barStart: bar.barStart });
    const time = localTime(bar.barStart);
    if (time < "09:30" || (time >= "11:30" && time < "13:00") || time >= "15:00") issues.push({ code: "NON_TRADING_SESSION", securityId: bar.securityId, barStart: bar.barStart });
    if (bar.volume < 0 || (bar.amount !== null && bar.amount < 0)) issues.push({ code: "UNIT_INVALID", securityId: bar.securityId, barStart: bar.barStart });
    if (requireAmount && bar.amount === null) issues.push({ code: "AMOUNT_UNAVAILABLE", securityId: bar.securityId, barStart: bar.barStart });
    if (bar.tradingStatus && bar.tradingStatus !== "UNKNOWN" && !bar.tradingStatusReference?.trim()) issues.push({ code: "INVALID_TRADING_STATUS_EVIDENCE", securityId: bar.securityId, barStart: bar.barStart });
    if (bar.tradingStatus === "SUSPENDED" && bar.tradingStatusReference?.trim()) issues.push({ code: "BAR_PRESENT_WHILE_SUSPENDED", securityId: bar.securityId, barStart: bar.barStart });
    const limits = bar.limitPriceReference;
    if (limits?.status === "AVAILABLE" && limits.sourceReference?.trim() && limits.marketRuleSetVersion?.trim() && Number.isFinite(limits.upperLimit) && Number.isFinite(limits.lowerLimit) && ((limits.upperLimit !== null && bar.high > limits.upperLimit) || (limits.lowerLimit !== null && bar.low < limits.lowerLimit))) issues.push({ code: "LIMIT_PRICE_BREACH", securityId: bar.securityId, barStart: bar.barStart });
  }
  return issues;
}

export function expectedWindows(securityIds: string[], fromDate: string, toDate: string, calendar: TradingCalendar, windowMinutes = 5): Array<{ securityId: string; barStart: string; barEnd: string }> {
  const result: Array<{ securityId: string; barStart: string; barEnd: string }> = [];
  for (let cursor = new Date(`${fromDate}T12:00:00Z`); dateOnly(cursor) <= toDate; cursor = plusMinutes(cursor, 1440)) {
    const date = dateOnly(cursor); const session = calendar.session(date);
    if (session.status !== "TRADING") continue;
    for (const slot of session.sessions ?? []) {
      for (let start = asUtc(date, slot.start), end = plusMinutes(start, windowMinutes); end <= asUtc(date, slot.end); start = end, end = plusMinutes(start, windowMinutes)) {
        for (const securityId of securityIds) result.push({ securityId, barStart: iso(start), barEnd: iso(end) });
      }
    }
  }
  return result;
}

export function buildCoverage(securityIds: string[], fromDate: string, toDate: string, bars: QualityBar[], calendar: TradingCalendar, options: { requireAmount?: boolean; requiredTradingDates?: number; windowMinutes?: 1 | 5; tradingStatusEvidence?: TradingStatusEvidence[] } = {}): CoverageReport {
  const expected = expectedWindows(securityIds, fromDate, toDate, calendar, options.windowMinutes ?? 5);
  const issues = validateBars(bars, options.requireAmount ?? true);
  const observed = new Map(bars.map((bar) => [`${bar.securityId}|${bar.barStart}`, bar]));
  const expectedByKey = new Map(expected.map((item) => [`${item.securityId}|${item.barStart}`, item]));
  const evidenceByKey = new Map<string, TradingStatusEvidence>();
  const invalidEvidence = new Set<string>();
  for (const evidence of options.tradingStatusEvidence ?? []) {
    const key = `${evidence.securityId}|${evidence.barStart}`;
    const slot = expectedByKey.get(key);
    if (!slot || slot.barEnd !== evidence.barEnd || typeof evidence.sourceReference !== "string" || !evidence.sourceReference.trim() || !["TRADING", "SUSPENDED"].includes(evidence.status)) { invalidEvidence.add(key); continue; }
    if (invalidEvidence.has(key)) continue;
    if (evidenceByKey.has(key)) { invalidEvidence.add(key); evidenceByKey.delete(key); continue; }
    evidenceByKey.set(key, evidence);
  }
  for (const key of invalidEvidence) {
    const [securityId, barStart] = key.split("|");
    issues.push({ code: "INVALID_TRADING_STATUS_EVIDENCE", securityId, barStart });
  }
  const gaps: GapRecord[] = [];
  const barStatuses: CoverageReport["barStatuses"] = [];
  let unknownBars = 0;
  let suspendedBars = 0;
  for (const item of expected) {
    const key = `${item.securityId}|${item.barStart}`;
    const bar = observed.get(key);
    const evidence = invalidEvidence.has(key) ? undefined : evidenceByKey.get(key);
    if (bar) {
      barStatuses.push({ ...item, status: "PRESENT" });
      if (evidence?.status === "SUSPENDED") issues.push({ code: "INVALID_TRADING_STATUS_EVIDENCE", securityId: item.securityId, barStart: item.barStart });
    } else if (evidence?.status === "SUSPENDED") {
      suspendedBars += 1;
      barStatuses.push({ ...item, status: "SUSPENDED", sourceReference: evidence.sourceReference });
    } else if (evidence?.status === "TRADING") {
      barStatuses.push({ ...item, status: "MISSING", sourceReference: evidence.sourceReference });
      gaps.push({ gapId: `gap:${key}`, ...item, reason: "MISSING", priority: "P1", evidenceReference: evidence.sourceReference });
    } else {
      unknownBars += 1;
      barStatuses.push({ ...item, status: "UNKNOWN" });
    }
  }
  for (const issue of issues.filter((item) => item.code === "DUPLICATE_CONFLICT")) gaps.push({ gapId: `duplicate:${issue.securityId}|${issue.barStart}`, securityId: issue.securityId, barStart: issue.barStart, barEnd: plusMinutes(new Date(issue.barStart), 5).toISOString(), reason: "DUPLICATE_CONFLICT", priority: "P1" });
  const unknownDates: string[] = [];
  for (let cursor = new Date(`${fromDate}T12:00:00Z`); dateOnly(cursor) <= toDate; cursor = plusMinutes(cursor, 1440)) {
    const date = dateOnly(cursor);
    if (calendar.session(date).status === "UNKNOWN") unknownDates.push(date);
  }
  const validBars = Math.max(0, observed.size - issues.filter((item) => item.code === "DUPLICATE_CONFLICT").length);
  const coveredTradingDates = new Set(bars.map((bar) => bar.barStart.slice(0, 10))).size;
  const requiredTradingDates = options.requiredTradingDates ?? new Set(expected.map((item) => item.barStart.slice(0, 10))).size;
  const missingBars = gaps.filter((gap) => gap.reason === "MISSING").length;
  return { status: unknownDates.length ? "WAITING_DEPENDENCY" : unknownBars || gaps.length || issues.length ? "INCOMPLETE" : "PASS", expectedBars: expected.length, validBars, missingBars, unknownBars, suspendedBars, duplicateBars: gaps.filter((gap) => gap.reason === "DUPLICATE_CONFLICT").length, barStatuses, issues, gaps, coveredTradingDates, requiredTradingDates };
}

export function prioritizeGaps(gaps: GapRecord[], now = Date.now()): GapRecord[] {
  return [...gaps].sort((a, b) => { const age = new Date(a.barEnd).getTime() - new Date(b.barEnd).getTime(); return age || a.priority.localeCompare(b.priority); }).map((gap) => ({ ...gap, priority: new Date(gap.barEnd).getTime() < now - 24 * 60 * 60_000 ? "P0" : gap.priority }));
}
