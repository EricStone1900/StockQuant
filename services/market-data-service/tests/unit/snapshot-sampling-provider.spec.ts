import { describe, expect, it, vi } from "vitest";
import { TencentSnapshotSamplingProvider } from "../../src/adapters/tencent-snapshot-sampling-provider.js";
import { SinaSnapshotSamplingProvider } from "../../src/adapters/sina-snapshot-sampling-provider.js";
import { isSnapshotSamplingProviderEnabled, normalizeSnapshotSamplingProviderResult, type SnapshotSamplingProviderRequest, type SnapshotSamplingProviderResult } from "../../src/application/snapshot-sampling-provider.js";

const request: SnapshotSamplingProviderRequest = {
  sourceId: "tencent-quote",
  securityIds: ["600000.SH", "000001.SZ"],
  scheduledAt: "2026-10-16T01:30:00.000Z",
  executionAt: "2026-10-16T01:30:02.000Z",
  maxAgeMinutes: 20,
};
const result: SnapshotSamplingProviderResult = {
  sourceId: "tencent-quote",
  quotes: [
    { securityId: "600000.SH", observedAt: "2026-10-16T01:30:00.000Z", price: "10.2500" },
    { securityId: "000001.SZ", observedAt: "2026-10-16T01:20:00.000Z", price: "12.3400" },
  ],
};

describe("snapshot sampling Provider port", () => {
  it("requires both source authorization and explicit runtime opt-in", () => {
    expect(isSnapshotSamplingProviderEnabled(true, {})).toBe(false);
    expect(isSnapshotSamplingProviderEnabled(false, { STOCKQUANT_SNAPSHOT_REAL_PROVIDER_ENABLED: "true" })).toBe(false);
    expect(isSnapshotSamplingProviderEnabled(true, { STOCKQUANT_SNAPSHOT_REAL_PROVIDER_ENABLED: "true" })).toBe(true);
  });

  it("normalizes complete source-matched results and preserves per-quote freshness", () => {
    expect(normalizeSnapshotSamplingProviderResult(request, result)).toEqual([
      { snapshotId: "tencent-quote:600000.SH:2026-10-16T01:30:00.000Z", securityId: "600000.SH", sourceId: "tencent-quote", dataMode: "REAL", observedAt: "2026-10-16T01:30:00.000Z", ingestedAt: request.executionAt, availableAt: request.executionAt, ageSeconds: 2, freshness: "FRESH", price: "10.2500", status: "READY" },
      { snapshotId: "tencent-quote:000001.SZ:2026-10-16T01:30:00.000Z", securityId: "000001.SZ", sourceId: "tencent-quote", dataMode: "REAL", observedAt: "2026-10-16T01:20:00.000Z", ingestedAt: request.executionAt, availableAt: request.executionAt, ageSeconds: 602, freshness: "FRESH", price: "12.3400", status: "READY" },
    ]);
  });

  it("keeps missing provider time UNKNOWN and never labels it READY", () => {
    const observations = normalizeSnapshotSamplingProviderResult(request, { ...result, quotes: result.quotes.map((quote, index) => index === 0 ? { ...quote, observedAt: null } : quote) });
    expect(observations[0]).toMatchObject({ observedAt: null, ageSeconds: null, freshness: "UNKNOWN", status: "UNKNOWN" });
  });

  it("labels old source timestamps STALE", () => {
    const observations = normalizeSnapshotSamplingProviderResult(request, { ...result, quotes: result.quotes.map((quote, index) => index === 0 ? { ...quote, observedAt: "2026-10-16T00:00:00.000Z" } : quote) });
    expect(observations[0]).toMatchObject({ freshness: "STALE", status: "STALE" });
  });

  it.each([
    [{ ...result, sourceId: "sina-quote" }, "SNAPSHOT_PROVIDER_SOURCE_MISMATCH"],
    [{ ...result, quotes: result.quotes.slice(0, 1) }, "SNAPSHOT_PROVIDER_INCOMPLETE_BATCH"],
    [{ ...result, quotes: [result.quotes[0], { ...result.quotes[1], securityId: "600000.SH" }] }, "SNAPSHOT_PROVIDER_SCOPE_MISMATCH"],
    [{ ...result, quotes: [result.quotes[0], { ...result.quotes[1], price: "0" }] }, "SNAPSHOT_PROVIDER_INVALID_PRICE"],
    [{ ...result, quotes: [result.quotes[0], { ...result.quotes[1], observedAt: "not-a-time" }] }, "SNAPSHOT_PROVIDER_INVALID_TIMESTAMP"],
  ] as const)("rejects invalid batch %#", (invalid, code) => {
    expect(() => normalizeSnapshotSamplingProviderResult(request, invalid)).toThrow(code);
  });

  it("passes the worker clock to the adapter and maps the selected source", async () => {
    const tencentQuotePreview = vi.fn(async (_symbols: string[], ingestedAt: string) => ({
      sourceId: "tencent-quote" as const,
      requestedSymbols: ["600000.SH"],
      securities: [{ symbol: "600000.SH", price: 10.25, name: "浦发银行", observedAt: "2026-10-16T01:29:00.000Z", ingestedAt, status: "LIVE_SOURCE" as const }],
      count: 1,
      ingestedAt,
    }));
    const provider = new TencentSnapshotSamplingProvider({ tencentQuotePreview });
    await expect(provider.sample({ ...request, securityIds: ["600000.SH"] })).resolves.toEqual({
      sourceId: "tencent-quote",
      quotes: [{ securityId: "600000.SH", observedAt: "2026-10-16T01:29:00.000Z", price: "10.2500" }],
    });
    expect(tencentQuotePreview).toHaveBeenCalledWith(["600000.SH"], request.executionAt);
  });

  it("maps complete Sina batches through the same Provider port and injected worker clock", async () => {
    const sinaQuotePreview = vi.fn(async (_symbols: string[], ingestedAt: string) => ({
      sourceId: "sina-quote" as const,
      requestedSymbols: ["600000.SH"],
      securities: [{ symbol: "600000.SH", price: 10.25, name: "浦发银行", observedAt: "2026-10-16T01:29:00.000Z", ingestedAt, status: "LIVE_SOURCE" as const }],
      count: 1,
      ingestedAt,
    }));
    const provider = new SinaSnapshotSamplingProvider({ sinaQuotePreview });
    await expect(provider.sample({ ...request, sourceId: "sina-quote", securityIds: ["600000.SH"] })).resolves.toEqual({
      sourceId: "sina-quote",
      quotes: [{ securityId: "600000.SH", observedAt: "2026-10-16T01:29:00.000Z", price: "10.2500" }],
    });
    expect(sinaQuotePreview).toHaveBeenCalledWith(["600000.SH"], request.executionAt);
  });

  it("fails closed on partial Sina results", async () => {
    const provider = new SinaSnapshotSamplingProvider({ sinaQuotePreview: vi.fn(async (_symbols: string[], ingestedAt: string) => ({
      sourceId: "sina-quote" as const, requestedSymbols: ["600000.SH", "000001.SZ"], count: 1, ingestedAt,
      securities: [{ symbol: "600000.SH", price: 10.25, name: "浦发银行", observedAt: "2026-10-16T01:29:00.000Z", ingestedAt, status: "LIVE_SOURCE" as const }],
    })) });
    await expect(provider.sample({ ...request, sourceId: "sina-quote" })).rejects.toThrow("SNAPSHOT_PROVIDER_SOURCE_UNAVAILABLE");
  });
});
