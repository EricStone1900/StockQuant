import type { ObservationRecord } from "../adapters/postgres-v24-observation-repository.js";

export const V24_EXPECTED_SAMPLING_SLOTS = [
  "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00",
] as const;
export const V24_EXECUTION_SLOT = "09:31";
export const V24_MAX_QUOTE_AGE_SECONDS = 1800;

export type ObservationQualityEvent = { eventKind: string | null; record: ObservationRecord };
export type ObservationDayQuality = {
  samplingEvents: number;
  uniqueSamplingWindows: number;
  missingSamplingWindows: string[];
  duplicateSamplingEvents: number;
  executionEvents: number;
  uniqueExecutionWindows: number;
  invalidSamplingEvents: number;
  invalidExecutionEvents: number;
  expectedSecuritySamples: number;
  validSecuritySamples: number;
  invalidSecuritySamples: number;
  errors: string[];
};

function localDateTime(value: string): { date: string; time: string } | null {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const field = (type: string) => parts.find((part) => part.type === type)?.value;
  const [year, month, day, hour, minute] = ["year", "month", "day", "hour", "minute"].map(field);
  if (!year || !month || !day || !hour || !minute) return null;
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

function evidenceOf(record: ObservationRecord): Record<string, unknown> {
  const evidence: unknown = record?.evidence;
  return typeof evidence === "object" && evidence !== null && !Array.isArray(evidence) ? evidence as Record<string, unknown> : {};
}

function validateSecuritySnapshot(record: ObservationRecord, errors: string[]): { expected: number; valid: number; invalid: number } {
  const evidence = evidenceOf(record);
  const probe = evidence.sourceProbe;
  if (typeof probe !== "object" || probe === null || Array.isArray(probe)) {
    errors.push("SOURCE_PROBE_MISSING");
    return { expected: 0, valid: 0, invalid: 1 };
  }
  const requested = (probe as { requestedSymbols?: unknown }).requestedSymbols;
  const securities = (probe as { securities?: unknown }).securities;
  if (!Array.isArray(requested) || requested.length === 0 || requested.some((item) => typeof item !== "string") || !Array.isArray(securities)) {
    errors.push("SOURCE_PROBE_UNVERIFIABLE");
    return { expected: 0, valid: 0, invalid: 1 };
  }
  const expectedSymbols = requested as string[];
  const expectedSet = new Set(expectedSymbols);
  let invalid = 0;
  if (expectedSet.size !== expectedSymbols.length) { invalid += 1; errors.push("REQUESTED_SECURITY_DUPLICATE"); }
  const actual = securities.filter((item): item is { symbol: string; status?: string; observedAt?: string | null } =>
    typeof item === "object" && item !== null && typeof (item as { symbol?: unknown }).symbol === "string");
  if (actual.length !== securities.length) { invalid += securities.length - actual.length; errors.push("SECURITY_QUOTE_MALFORMED"); }
  const bySymbol = new Map<string, typeof actual>();
  for (const quote of actual) bySymbol.set(quote.symbol, [...(bySymbol.get(quote.symbol) ?? []), quote]);
  const recordedAt = evidence.recordedAt;
  const referenceMs = typeof recordedAt === "string" ? Date.parse(recordedAt) : Number.NaN;
  let valid = 0;
  for (const symbol of expectedSet) {
    const quotes = bySymbol.get(symbol) ?? [];
    if (quotes.length !== 1) {
      invalid += 1;
      errors.push(quotes.length === 0 ? `SECURITY_QUOTE_MISSING:${symbol}` : `SECURITY_QUOTE_DUPLICATE:${symbol}`);
      continue;
    }
    const quote = quotes[0];
    const observedMs = typeof quote.observedAt === "string" ? Date.parse(quote.observedAt) : Number.NaN;
    const ageSeconds = (referenceMs - observedMs) / 1000;
    if (quote.status !== "LIVE_SOURCE" || !Number.isFinite(referenceMs) || !Number.isFinite(observedMs) || ageSeconds < 0 || ageSeconds > V24_MAX_QUOTE_AGE_SECONDS) {
      invalid += 1;
      errors.push(`SECURITY_QUOTE_INVALID:${symbol}`);
    } else valid += 1;
  }
  for (const symbol of bySymbol.keys()) if (!expectedSet.has(symbol)) {
    invalid += 1;
    errors.push(`UNREQUESTED_SECURITY_QUOTE:${symbol}`);
  }
  if (record.sourceAvailable !== true || record.outageStatus !== "NONE") {
    invalid += 1;
    errors.push("SOURCE_NOT_AVAILABLE_FOR_ALL_SECURITIES");
  }
  return { expected: expectedSet.size, valid, invalid };
}

export function calculateObservationDayQuality(observationDate: string, events: ObservationQualityEvent[]): ObservationDayQuality {
  const quality: ObservationDayQuality = {
    samplingEvents: 0, uniqueSamplingWindows: 0, missingSamplingWindows: [...V24_EXPECTED_SAMPLING_SLOTS], duplicateSamplingEvents: 0,
    executionEvents: 0, uniqueExecutionWindows: 0, invalidSamplingEvents: 0, invalidExecutionEvents: 0,
    expectedSecuritySamples: 0, validSecuritySamples: 0, invalidSecuritySamples: 0, errors: [],
  };
  const seenSampling = new Set<string>();
  const seenExecution = new Set<string>();
  const errors = new Set<string>();
  for (const { eventKind, record } of events) {
    if (eventKind !== "SAMPLING_SLOT" && eventKind !== "EXECUTION_WINDOW") continue;
    if (typeof record !== "object" || record === null) {
      if (eventKind === "SAMPLING_SLOT") { quality.samplingEvents += 1; quality.invalidSamplingEvents += 1; }
      else { quality.executionEvents += 1; quality.invalidExecutionEvents += 1; }
      errors.add("OBSERVATION_RECORD_UNVERIFIABLE");
      continue;
    }
    const evidence = evidenceOf(record);
    const schedule = typeof evidence.scheduledFor === "string" ? localDateTime(evidence.scheduledFor) : null;
    const validDate = schedule?.date === observationDate;
    if (eventKind === "SAMPLING_SLOT") {
      quality.samplingEvents += 1;
      const expectedSlot = schedule?.time && (V24_EXPECTED_SAMPLING_SLOTS as readonly string[]).includes(schedule.time) ? schedule.time : null;
      if (!validDate || !expectedSlot) {
        quality.invalidSamplingEvents += 1;
        errors.add("SAMPLING_WINDOW_UNEXPECTED_OR_MISSING");
        continue;
      }
      if (seenSampling.has(expectedSlot)) {
        quality.duplicateSamplingEvents += 1;
        quality.invalidSamplingEvents += 1;
        errors.add(`SAMPLING_WINDOW_DUPLICATE:${expectedSlot}`);
        continue;
      }
      seenSampling.add(expectedSlot);
      quality.missingSamplingWindows = quality.missingSamplingWindows.filter((slot) => slot !== expectedSlot);
      const delay = evidence.scheduledDelaySeconds;
      if (record.samplingEvery30Minutes !== true || typeof delay !== "number" || !Number.isFinite(delay) || Math.abs(delay) > 60) {
        errors.add(`SAMPLING_WINDOW_DELAYED:${expectedSlot}`);
      }
    } else {
      quality.executionEvents += 1;
      if (!validDate || schedule?.time !== V24_EXECUTION_SLOT) {
        quality.invalidExecutionEvents += 1;
        errors.add("EXECUTION_WINDOW_UNEXPECTED_OR_MISSING");
        continue;
      }
      if (seenExecution.has(V24_EXECUTION_SLOT)) {
        quality.invalidExecutionEvents += 1;
        errors.add("EXECUTION_WINDOW_DUPLICATE:09:31");
        continue;
      }
      seenExecution.add(V24_EXECUTION_SLOT);
    }
    let invalidEvent = false;
    const eventErrors: string[] = [];
    const sample = validateSecuritySnapshot(record, eventErrors);
    quality.expectedSecuritySamples += sample.expected;
    quality.validSecuritySamples += sample.valid;
    quality.invalidSecuritySamples += sample.invalid;
    if (sample.invalid > 0) invalidEvent = true;
    for (const error of eventErrors) errors.add(error);
    const recordErrors: unknown = record.errors;
    if (Array.isArray(recordErrors)) for (const error of recordErrors) if (typeof error === "string") errors.add(error);
    if (!Array.isArray(recordErrors) || recordErrors.length > 0) { errors.add("OBSERVATION_ERRORS_UNVERIFIABLE"); invalidEvent = true; }
    if (eventKind === "SAMPLING_SLOT" && (record.samplingEvery30Minutes !== true || typeof evidence.scheduledDelaySeconds !== "number" || !Number.isFinite(evidence.scheduledDelaySeconds) || Math.abs(evidence.scheduledDelaySeconds) > 60)) invalidEvent = true;
    if (invalidEvent && eventKind === "SAMPLING_SLOT") quality.invalidSamplingEvents += 1;
    else if (invalidEvent) quality.invalidExecutionEvents += 1;
  }
  quality.uniqueSamplingWindows = seenSampling.size;
  quality.uniqueExecutionWindows = seenExecution.size;
  quality.errors = [...errors].sort();
  return quality;
}
