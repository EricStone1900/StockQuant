import type { MinuteImportBar } from "../domain/minute-import.js";

export type DailyReference = { open: number; high: number; low: number; close: number; volume: number; amount: number };
export type DailyAggregateReport = {
  status: "MATCH" | "DIFFERENT" | "INCOMPLETE";
  securityId: string;
  tradingDate: string;
  frequency: "1m" | "5m";
  observedBars: number;
  aggregate: DailyReference | null;
  reference: DailyReference;
  differences: Array<{ field: keyof DailyReference; aggregate: number; reference: number; delta: number }>;
  referenceSource: string;
  sourceReference: string;
  referenceVerification: "OPERATOR_SUPPLIED_NOT_INDEPENDENTLY_VERIFIED";
  completeness: "NOT_ASSESSED_BY_AGGREGATION";
  issues: string[];
};

const fields: Array<keyof DailyReference> = ["open", "high", "low", "close", "volume", "amount"];
const shanghaiDate = (value: string): string => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const DECIMAL_SCALE = 100_000_000n;
const toScaled = (value: number): bigint => BigInt(value.toFixed(8).replace(".", ""));
const fromScaled = (value: bigint): number => Number(value) / Number(DECIMAL_SCALE);

export function compareMinuteDailyAggregate(input: {
  bars: MinuteImportBar[];
  securityId: string;
  tradingDate: string;
  frequency: "1m" | "5m";
  reference: DailyReference;
  referenceSource: string;
  sourceReference: string;
}): DailyAggregateReport {
  const issues: string[] = [];
  const parsedDate = new Date(`${input.tradingDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.tradingDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.tradingDate) issues.push("INVALID_TRADING_DATE");
  if (!input.securityId.trim() || !input.referenceSource.trim() || !input.sourceReference.trim()) issues.push("IDENTITY_OR_REFERENCE_MISSING");
  if (fields.some((field) => !Number.isFinite(input.reference[field]) || input.reference[field] < 0)) issues.push("REFERENCE_VALUE_INVALID");
  if (Number.isFinite(input.reference.open) && Number.isFinite(input.reference.high) && Number.isFinite(input.reference.low) && Number.isFinite(input.reference.close) && !(input.reference.high >= Math.max(input.reference.open, input.reference.close, input.reference.low) && input.reference.low <= Math.min(input.reference.open, input.reference.close, input.reference.high))) issues.push("REFERENCE_OHLC_INVALID");
  if (!input.bars.length) issues.push("NO_MINUTE_BARS");
  const bars = [...input.bars].sort((a, b) => a.barStart.localeCompare(b.barStart));
  const seen = new Set<string>();
  for (const bar of bars) {
    if (bar.securityId !== input.securityId || shanghaiDate(bar.barStart) !== input.tradingDate || bar.frequency !== input.frequency || bar.adjustment !== "RAW") issues.push("BAR_SCOPE_OR_SEMANTICS_MISMATCH");
    if (seen.has(bar.barStart)) issues.push("DUPLICATE_MINUTE_BAR");
    seen.add(bar.barStart);
    if ([bar.open, bar.high, bar.low, bar.close, bar.volume, bar.amount].some((value) => !Number.isFinite(value) || value < 0)) issues.push("MINUTE_VALUE_INVALID");
    if (!(bar.high >= Math.max(bar.open, bar.close, bar.low) && bar.low <= Math.min(bar.open, bar.close, bar.high))) issues.push("MINUTE_OHLC_INVALID");
  }
  const uniqueIssues = [...new Set(issues)];
  const aggregate = uniqueIssues.length ? null : {
    open: bars[0]!.open,
    high: Math.max(...bars.map((bar) => bar.high)),
    low: Math.min(...bars.map((bar) => bar.low)),
    close: bars.at(-1)!.close,
    volume: fromScaled(bars.reduce((sum, bar) => sum + toScaled(bar.volume), 0n)),
    amount: fromScaled(bars.reduce((sum, bar) => sum + toScaled(bar.amount), 0n)),
  };
  const differences = aggregate ? fields.filter((field) => toScaled(aggregate[field]) !== toScaled(input.reference[field])).map((field) => ({ field, aggregate: aggregate[field], reference: input.reference[field], delta: fromScaled(toScaled(aggregate[field]) - toScaled(input.reference[field])) })) : [];
  return {
    status: !aggregate ? "INCOMPLETE" : differences.length ? "DIFFERENT" : "MATCH",
    securityId: input.securityId,
    tradingDate: input.tradingDate,
    frequency: input.frequency,
    observedBars: bars.length,
    aggregate,
    reference: input.reference,
    differences,
    referenceSource: input.referenceSource.trim(),
    sourceReference: input.sourceReference.trim(),
    referenceVerification: "OPERATOR_SUPPLIED_NOT_INDEPENDENTLY_VERIFIED",
    completeness: "NOT_ASSESSED_BY_AGGREGATION",
    issues: uniqueIssues,
  };
}
