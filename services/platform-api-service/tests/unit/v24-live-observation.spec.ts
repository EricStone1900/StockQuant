import { afterEach, describe, expect, it, vi } from "vitest";
import { PostgresV24ObservationRepository, type ObservationRecord } from "../../src/adapters/postgres-v24-observation-repository.js";
import { V24LiveObservationHandler } from "../../src/application/v24-live-observation.js";

afterEach(() => vi.unstubAllGlobals());

function fixtureHandler(options: { ages?: number[]; statuses?: string[] } = {}) {
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
    if (url.includes("/v2/calendar/")) return Response.json({ status: "TRADING", calendarVersion: "test" });
    if (url.endsWith("/v2/quote/preview")) return Response.json({
      requestedSymbols: symbols,
      securities: symbols.map((symbol, index) => ({ symbol, status: statuses[index], observedAt: new Date(now.getTime() - ages[index] * 1000).toISOString() })),
    });
    throw new Error(`unexpected URL: ${url}`);
  }));
  return { handler: new V24LiveObservationHandler(repository, "http://market.test"), now, records };
}

describe("V2.4 live quote evidence", () => {
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
