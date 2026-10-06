import { afterEach, describe, expect, it, vi } from "vitest";
import { PostgresV24ObservationRepository, type ObservationRecord } from "../../src/adapters/postgres-v24-observation-repository.js";
import { hasMissedV24SamplingWindow, isV24QuoteSourceUseConfigured, V24LiveObservationHandler } from "../../src/application/v24-live-observation.js";

afterEach(() => vi.unstubAllGlobals());

describe("V2.4 quote source authorization configuration", () => {
  it("requires explicit approval, a non-empty authorization reference and a data version", () => {
    expect(isV24QuoteSourceUseConfigured({ approved: false, authorizationRef: "ref", dataVersion: "v1" })).toBe(false);
    expect(isV24QuoteSourceUseConfigured({ approved: true, authorizationRef: " ", dataVersion: "v1" })).toBe(false);
    expect(isV24QuoteSourceUseConfigured({ approved: true, authorizationRef: "ref", dataVersion: " " })).toBe(false);
    expect(isV24QuoteSourceUseConfigured({ approved: true, authorizationRef: " ref ", dataVersion: " v1 " })).toBe(true);
  });
});

describe("V2.4 scheduled sampling recovery gaps", () => {
  it("uses the configured 20-minute cadence instead of a fixed 30-minute threshold", () => {
    expect(hasMissedV24SamplingWindow({ previousSampleAt: "2026-09-25T02:00:00.000Z", now: new Date("2026-09-25T02:25:00.000Z"), samplingIntervalMinutes: 20, scheduledFor: null })).toBe(true);
  });
  it("does not treat the current scheduled sample as a missed window", () => {
    expect(hasMissedV24SamplingWindow({ previousSampleAt: "2026-09-25T02:00:00.000Z", now: new Date("2026-09-25T02:30:00.000Z"), samplingIntervalMinutes: 30, scheduledFor: "2026-09-25T02:30:00.000Z" })).toBe(false);
  });
  it("skips lunch and reports a missed afternoon slot", () => {
    expect(hasMissedV24SamplingWindow({ previousSampleAt: "2026-09-25T03:30:00.000Z", now: new Date("2026-09-25T05:10:00.000Z"), samplingIntervalMinutes: 30, scheduledFor: null })).toBe(true);
    expect(hasMissedV24SamplingWindow({ previousSampleAt: "2026-09-25T03:30:00.000Z", now: new Date("2026-09-25T04:00:00.000Z"), samplingIntervalMinutes: 30, scheduledFor: null })).toBe(false);
  });
  it("does not carry a previous trading day into today's same-day gap check", () => {
    expect(hasMissedV24SamplingWindow({ previousSampleAt: "2026-09-24T07:00:00.000Z", now: new Date("2026-09-25T02:00:00.000Z"), samplingIntervalMinutes: 20, scheduledFor: null })).toBe(false);
  });
  it("persists the recovery action when a configured cadence slot was missed", async () => {
    const { handler, records } = fixtureHandler({ quoteSourceUseApproved: false });
    await handler.handleTick({ now: new Date("2026-09-25T02:05:00.000Z"), previousSampleAt: "2026-09-25T01:40:00.000Z", kind: "RECOVERY_CHECK", scheduledFor: null, samplingIntervalMinutes: 20 });
    expect(records[0].recoveryActions).toContain("RECOVERY_GAP_RECORDED_NO_BACKFILL");
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(expect.stringContaining("/v2/quote/preview"), expect.anything());
  });
});

function fixtureHandler(options: { ages?: number[]; statuses?: string[]; calendarStatus?: "TRADING" | "CLOSED" | "UNKNOWN"; quoteSourceUseApproved?: boolean; quoteSourceAuthorizationRef?: string; quoteDataVersion?: string } = {}) {
  const now = new Date("2026-09-25T02:00:00.000Z");
  const symbols = ["600000.SH", "000001.SZ"];
  const ages = options.ages ?? [5, 5];
  const statuses = options.statuses ?? ["LIVE_SOURCE", "LIVE_SOURCE"];
  const records: ObservationRecord[] = [];
  const repository = {
    ensureDailyTestRun: vi.fn(async () => "00000000-0000-4000-8000-000000000001"),
    upsertObservation: vi.fn(async (record: ObservationRecord) => { records.push(record); }),
  } as unknown as PostgresV24ObservationRepository;
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("/v2/calendar/")) return Response.json({ status: options.calendarStatus ?? "TRADING", calendarVersion: "test" });
    if (url.endsWith("/v2/quote/preview")) return Response.json({
      requestedSymbols: symbols,
      securities: symbols.map((symbol, index) => ({ symbol, status: statuses[index], observedAt: new Date(now.getTime() - ages[index] * 1000).toISOString() })),
    });
    throw new Error(`unexpected URL: ${url}`);
  }));
  return { handler: new V24LiveObservationHandler(repository, "http://market.test", "http://execution.test", "p".repeat(40), options.quoteSourceUseApproved ?? true, options.quoteSourceAuthorizationRef ?? "test-approval-ref", options.quoteDataVersion ?? "test-market-data-v1"), repository, now, records };
}

describe.each(["CLOSED", "UNKNOWN"] as const)("V2.4 %s calendar fail-closed behavior", (calendarStatus) => {
  it("does not create a daily run, request quotes, or enter the Paper execution path", async () => {
    const { handler, repository, now, records } = fixtureHandler({ calendarStatus });
    await handler.handleTick({ now, previousSampleAt: null, kind: "EXECUTION_WINDOW", scheduledFor: now.toISOString() });

    expect(repository.ensureDailyTestRun).not.toHaveBeenCalled();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ observationDate: "2026-09-25", sourceAvailable: null, testRunId: null });
    expect(records[0].evidence).toMatchObject({ actualTradingDay: calendarStatus, observationCounted: false, sourceProbe: null, noBackfill: true });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining("/v2/calendar/cn-a-share/2026-09-25"), expect.anything());
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(expect.stringContaining("/v2/quote/preview"), expect.anything());
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(expect.stringContaining("/paper/"), expect.anything());
  });
});

describe("V2.4 live quote evidence", () => {
  it("fails closed without source-use authorization and never requests the quote endpoint", async () => {
    const { handler, now, records } = fixtureHandler({ quoteSourceUseApproved: false });
    await handler.handleTick({ now, previousSampleAt: null, kind: "SAMPLING_SLOT", scheduledFor: now.toISOString() });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ sourceAvailable: false, lastSnapshotAt: null, dataAgeSeconds: null, outageStatus: "UNKNOWN", errors: ["QUOTE_SOURCE_USE_NOT_AUTHORIZED"] });
    expect(records[0].evidence).toMatchObject({ dataMode: "NOT_CONNECTED", sourceUsage: { status: "NOT_AUTHORIZED", sourceId: "tencent-quote", authorizationEvidenceRef: "test-approval-ref", dataVersion: "test-market-data-v1" }, sourceProbe: null });
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(expect.stringContaining("/v2/quote/preview"), expect.anything());
  });

  it("persists an explicit pause reason at the execution window when the source is unauthorized", async () => {
    const { handler, now, records } = fixtureHandler({ quoteSourceUseApproved: false });
    await handler.handleTick({ now, previousSampleAt: null, kind: "EXECUTION_WINDOW", scheduledFor: now.toISOString() });
    expect(records[0]).toMatchObject({ enteredExecutionWindow: true, signalStatus: "UNKNOWN", simulatedOrderStatus: "UNKNOWN", fillStatus: "UNKNOWN" });
    expect(records[0].evidence.executionGate).toEqual({ status: "PAUSED", reason: "QUOTE_SOURCE_NOT_AUTHORIZED" });
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(expect.stringContaining("/v2/quote/preview"), expect.anything());
  });

  it.each([
    { label: "stale", ages: [5, 1801], statuses: ["LIVE_SOURCE", "LIVE_SOURCE"], reason: "QUOTE_DATA_STALE" },
    { label: "disconnected", ages: [5, 5], statuses: ["LIVE_SOURCE", "MISSING_TIMESTAMP"], reason: "QUOTE_SOURCE_DISCONNECTED" },
  ])("persists a fail-closed pause reason for $label quotes", async ({ ages, statuses, reason }) => {
    const { handler, now, records } = fixtureHandler({ ages, statuses });
    await handler.handleTick({ now, previousSampleAt: null, kind: "EXECUTION_WINDOW", scheduledFor: now.toISOString() });
    expect(records[0].evidence.executionGate).toEqual({ status: "PAUSED", reason });
    expect(records[0].signalStatus).toBe("UNKNOWN");
    expect(records[0].simulatedOrderStatus).toBe("UNKNOWN");
    expect(records[0].fillStatus).toBe("UNKNOWN");
  });

  it("does not overwrite the last execution gate in later same-day sampling records", async () => {
    const { handler, now, records } = fixtureHandler({ quoteSourceUseApproved: false });
    await handler.handleTick({ now, previousSampleAt: null, kind: "EXECUTION_WINDOW", scheduledFor: now.toISOString() });
    await handler.handleTick({ now: new Date(now.getTime() + 30 * 60_000), previousSampleAt: now.toISOString(), kind: "SAMPLING_SLOT", scheduledFor: new Date(now.getTime() + 30 * 60_000).toISOString() });
    expect(records[0].evidence.executionGate).toEqual({ status: "PAUSED", reason: "QUOTE_SOURCE_NOT_AUTHORIZED" });
    expect(records[1].evidence).not.toHaveProperty("executionGate");
  });

  it("requires an approval reference and data version before a configured source may be read", async () => {
    const { handler, now, records } = fixtureHandler({ quoteSourceUseApproved: true, quoteSourceAuthorizationRef: "", quoteDataVersion: "" });
    await handler.handleTick({ now, previousSampleAt: null, kind: "SAMPLING_SLOT", scheduledFor: now.toISOString() });
    expect(records[0]).toMatchObject({ sourceAvailable: false, errors: ["QUOTE_SOURCE_AUTHORIZATION_REFERENCE_MISSING", "QUOTE_DATA_VERSION_MISSING"] });
    expect(records[0].evidence).toMatchObject({ dataMode: "NOT_CONNECTED", sourceUsage: { status: "APPROVAL_EVIDENCE_INCOMPLETE", authorizationEvidenceRef: null, dataVersion: null }, sourceProbe: null });
    expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(expect.stringContaining("/v2/quote/preview"), expect.anything());
  });

  it("records coverage and uses the oldest requested-security quote age", async () => {
    const { handler, now, records } = fixtureHandler({ ages: [5, 75] });
    await handler.handleTick({ now, previousSampleAt: null, kind: "SAMPLING_SLOT", scheduledFor: now.toISOString() });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ sourceAvailable: true, dataAgeSeconds: 75, outageStatus: "NONE" });
    expect(records[0].evidence.sourceProbe).toMatchObject({ requestedSymbols: ["600000.SH", "000001.SZ"] });
  });

  it("marks the entire probe stale when any requested security exceeds the freshness limit", async () => {
    const { handler, now, records } = fixtureHandler({ ages: [5, 1801] });
    await handler.handleTick({ now, previousSampleAt: null, kind: "SAMPLING_SLOT", scheduledFor: now.toISOString() });
    expect(records[0]).toMatchObject({ sourceAvailable: false, dataAgeSeconds: 1801, outageStatus: "STALE" });
  });

  it("rejects malformed source rows even if another security has a current quote", async () => {
    const { handler, now, records } = fixtureHandler({ ages: [5, 5], statuses: ["LIVE_SOURCE", "MISSING_TIMESTAMP"] });
    await handler.handleTick({ now, previousSampleAt: null, kind: "SAMPLING_SLOT", scheduledFor: now.toISOString() });
    expect(records[0]).toMatchObject({ sourceAvailable: false, outageStatus: "DISCONNECTED" });
    expect(records[0].dataAgeSeconds).toBe(5);
  });
});
