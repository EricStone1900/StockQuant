import { describe, expect, it } from "vitest";
import type { ObservationRecord } from "../../src/adapters/postgres-v24-observation-repository.js";
import { calculateObservationDayQuality, V24_EXPECTED_SAMPLING_SLOTS } from "../../src/application/v24-observation-quality.js";
import { v24SamplingSlots } from "../../src/application/v24-scheduler.js";

const date = "2026-09-25";
const event = (eventKind: string, time: string, options: { symbols?: string[]; missing?: string[]; stale?: string[] } = {}) => {
  const scheduledFor = new Date(`${date}T${time}:00+08:00`).toISOString();
  const symbols = options.symbols ?? ["600000.SH", "000001.SZ"];
  const securities = symbols.filter((symbol) => !options.missing?.includes(symbol)).map((symbol) => ({
    symbol,
    status: "LIVE_SOURCE",
    observedAt: new Date(Date.parse(scheduledFor) - (options.stale?.includes(symbol) ? 1801 : 5) * 1000).toISOString(),
  }));
  const record = {
    observationDate: date, sourceAvailable: true, lastSnapshotAt: scheduledFor, dataAgeSeconds: 5,
    samplingEvery30Minutes: true, enteredExecutionWindow: eventKind === "EXECUTION_WINDOW",
    signalStatus: "HOLD", simulatedOrderStatus: "NONE", fillStatus: "NONE", reconciliationStatus: "UNKNOWN",
    outageStatus: "NONE", testRunId: "00000000-0000-4000-8000-000000000001", errors: [], recoveryActions: [],
    evidence: { eventKind, scheduledFor, scheduledDelaySeconds: 0, samplingIntervalMinutes: 30, recordedAt: scheduledFor, sourceProbe: { requestedSymbols: symbols, securities } },
  } as ObservationRecord;
  return { eventKind, record };
};

function completeDay() {
  return [
    ...V24_EXPECTED_SAMPLING_SLOTS.map((slot) => event("SAMPLING_SLOT", slot)),
    event("EXECUTION_WINDOW", "09:31"),
  ];
}

describe("V2.4 observation window and security quality", () => {
  it("schedules and qualifies all fourteen windows under the frozen 20-minute policy", () => {
    expect(v24SamplingSlots(20)).toHaveLength(14);
    const rows = v24SamplingSlots(20).map((slot) => {
      const row = event("SAMPLING_SLOT", slot.slice(0, 5));
      row.record.evidence.samplingIntervalMinutes = 20;
      row.record.samplingEvery30Minutes = false;
      return row;
    });
    rows.push(event("EXECUTION_WINDOW", "09:31"));
    const quality = calculateObservationDayQuality(date, rows);
    expect(quality).toMatchObject({ samplingIntervalMinutes: 20, samplingEvents: 14, uniqueSamplingWindows: 14, missingSamplingWindows: [], invalidSamplingEvents: 0, errors: [] });
  });

  it("rejects a day that mixes sampling policies", () => {
    const rows = completeDay();
    rows[0].record.evidence.samplingIntervalMinutes = 20;
    const quality = calculateObservationDayQuality(date, rows);
    expect(quality.samplingIntervalMinutes).toBeNull();
    expect(quality.invalidSamplingEvents).toBeGreaterThan(0);
  });

  it("requires all ten distinct scheduled sample windows and a fresh quote for every requested security", () => {
    const quality = calculateObservationDayQuality(date, completeDay());
    expect(quality).toMatchObject({ samplingEvents: 10, uniqueSamplingWindows: 10, missingSamplingWindows: [], executionEvents: 1, uniqueExecutionWindows: 1, expectedSecuritySamples: 22, validSecuritySamples: 22, invalidSecuritySamples: 0, invalidSamplingEvents: 0, invalidExecutionEvents: 0, errors: [] });
  });

  it("does not let repeated scheduler events replace a missing window", () => {
    const rows = completeDay();
    rows.splice(3, 1);
    rows.push(event("SAMPLING_SLOT", "10:30"));
    const quality = calculateObservationDayQuality(date, rows);
    expect(quality.uniqueSamplingWindows).toBe(9);
    expect(quality.missingSamplingWindows).toEqual(["11:00"]);
    expect(quality.duplicateSamplingEvents).toBe(1);
    expect(quality.invalidSamplingEvents).toBe(1);
  });

  it("rejects missing and stale per-security quotes even when the aggregate event has a fresh quote", () => {
    const rows = completeDay();
    rows[0] = event("SAMPLING_SLOT", "09:30", { missing: ["000001.SZ"] });
    rows[1] = event("SAMPLING_SLOT", "10:00", { stale: ["000001.SZ"] });
    const quality = calculateObservationDayQuality(date, rows);
    expect(quality.invalidSecuritySamples).toBe(2);
    expect(quality.validSecuritySamples).toBe(20);
    expect(quality.invalidSamplingEvents).toBe(2);
    expect(quality.errors).toContain("SECURITY_QUOTE_MISSING:000001.SZ");
    expect(quality.errors).toContain("SECURITY_QUOTE_INVALID:000001.SZ");
  });

  it("rejects events without a scheduled window or an auditable requested universe", () => {
    const rows = completeDay();
    rows[0] = event("SAMPLING_SLOT", "09:30");
    rows[0].record.evidence.scheduledFor = undefined;
    delete (rows[1].record.evidence.sourceProbe as { requestedSymbols?: string[] }).requestedSymbols;
    rows[2].record.evidence = undefined as unknown as Record<string, unknown>;
    const quality = calculateObservationDayQuality(date, rows);
    expect(quality.invalidSamplingEvents).toBeGreaterThanOrEqual(2);
    expect(quality.errors).toContain("SAMPLING_WINDOW_UNEXPECTED_OR_MISSING");
    expect(quality.errors).toContain("SOURCE_PROBE_UNVERIFIABLE");
  });
});
