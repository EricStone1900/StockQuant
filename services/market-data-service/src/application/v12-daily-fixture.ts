export type V12DailyBar = {
  securityId: string;
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustment: "raw";
};

export type V12QualityError = { code: string; row?: number; ticker?: string; date?: string };
export type V12QualityReport = { status: "READY" | "REJECTED"; errors: V12QualityError[] };
export type ParsedV12DailyFixture = { bars: V12DailyBar[]; structuralErrors: V12QualityError[] };

const COLUMNS = ["security_id", "ticker", "date", "open", "high", "low", "close", "volume", "adjustment"];

export function parseV12DailyFixture(csv: string): ParsedV12DailyFixture {
  const lines = csv.replace(/^\uFEFF/u, "").trimEnd().split(/\r?\n/u);
  const header = (lines.shift() ?? "").split(",");
  const structuralErrors: V12QualityError[] = [];
  if (header.length !== COLUMNS.length || header.some((column, index) => column !== COLUMNS[index])) {
    return { bars: [], structuralErrors: [{ code: "COLUMN_MAPPING_INVALID", row: 1 }] };
  }
  const bars = lines.map((line, index): V12DailyBar => {
    const row = index + 2;
    const values = line.split(",");
    if (values.length !== COLUMNS.length) structuralErrors.push({ code: "COLUMN_COUNT_INVALID", row });
    const value = (column: number) => values[column] ?? "";
    for (const column of [3, 4, 5, 6, 7]) if (!value(column).trim()) structuralErrors.push({ code: "NUMERIC_VALUE_MISSING", row, ticker: value(1), date: value(2) });
    const adjustment = value(8);
    if (adjustment !== "raw") structuralErrors.push({ code: "ADJUSTMENT_UNSUPPORTED", row, ticker: value(1), date: value(2) });
    return {
      securityId: value(0), ticker: value(1), date: value(2),
      open: Number(value(3)), high: Number(value(4)), low: Number(value(5)), close: Number(value(6)), volume: Number(value(7)),
      adjustment: "raw",
    };
  });
  return { bars, structuralErrors };
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateV12DailyBars(bars: V12DailyBar[], asOf: string, initialErrors: V12QualityError[] = []): V12QualityReport {
  const errors = [...initialErrors];
  const keys = new Set<string>();
  bars.forEach((bar, index) => {
    const row = index + 2;
    const context = { row, ticker: bar.ticker || undefined, date: bar.date || undefined };
    if (!bar.securityId.trim() || !bar.ticker.trim()) errors.push({ code: "SECURITY_MAPPING_MISSING", ...context });
    if (!validDate(bar.date)) errors.push({ code: "DATE_INVALID", ...context });
    else if (validDate(asOf) && bar.date > asOf) errors.push({ code: "FUTURE_DATA", ...context });
    const values = [bar.open, bar.high, bar.low, bar.close, bar.volume];
    if (values.some((value) => !Number.isFinite(value))) errors.push({ code: "NUMERIC_VALUE_INVALID", ...context });
    else {
      if (!(bar.high >= bar.low && bar.high >= bar.open && bar.high >= bar.close && bar.low <= bar.open && bar.low <= bar.close)) errors.push({ code: "OHLC_INVALID", ...context });
      if (bar.volume < 0) errors.push({ code: "VOLUME_INVALID", ...context });
    }
    const key = `${bar.securityId}\u0000${bar.date}`;
    if (keys.has(key)) errors.push({ code: "BAR_DUPLICATE", ...context });
    keys.add(key);
  });
  if (!validDate(asOf)) errors.push({ code: "AS_OF_INVALID" });
  return { status: errors.length ? "REJECTED" : "READY", errors };
}

export function canPublishV12DailyFixture(report: V12QualityReport): boolean {
  return report.status === "READY" && report.errors.length === 0;
}
