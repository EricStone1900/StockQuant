import { afterEach, describe, expect, it, vi } from "vitest";
import { V25AcceptanceController } from "../../src/bootstrap/app.module.js";

const owner = "acceptance-owner-1";
const identityHeaders = { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` };
const imported = {
  importId: "minute-import-abc123", version: "minute-v1", status: "PUBLISHED", accepted: 120,
  errors: [], sha256: "a".repeat(64), idempotent: false,
  manifest: { mapping: {}, semantics: { frequency: "5m", adjustment: "RAW" }, provenance: { sourceName: "local-archive", sourceReference: null, licenseStatement: "local validation", licenseVerification: "UNCONFIRMED", acquiredAt: "2026-10-29T00:00:00Z" }, researchUseAllowed: false, historicalContext: { securityUniverseVersion: null, marketRuleSetVersion: null, corporateActionVersion: null }, historicalContextStatus: "LIMITED_MISSING_REFERENCES" },
};
const page = { version: "minute-v1", items: Array.from({ length: 2 }, (_, index) => ({ securityId: "600000.SH", market: "CN_A", frequency: "5m", barStart: `2024-01-0${index + 2}T01:30:00+08:00`, barEnd: `2024-01-0${index + 2}T01:35:00+08:00`, availableAt: `2024-01-0${index + 2}T01:35:00+08:00`, open: 10, high: 10, low: 10, close: 10, volume: 100, amount: 1000, adjustment: "RAW", tradingStatus: "TRADING", tradingStatusReference: null, limitPriceReference: null })), nextCursor: "2" };

afterEach(() => vi.unstubAllGlobals());

describe("V2.5 persisted minute-import TestRun", () => {
  it("reads a published import and bounded page through the service client, then binds both to an owner-scoped durable Run", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json(imported))
      .mockResolvedValueOnce(Response.json(page));
    vi.stubGlobal("fetch", fetch);
    const saved = new Map<string, any>();
    const stageRuns = {
      newId: () => "11111111-1111-4111-8111-111111111111",
      save: vi.fn(async (run: any) => { saved.set(run.testRunId, { ...run, createdAt: "2026-10-29T00:00:00Z", completedAt: null }); return saved.get(run.testRunId); }),
      find: vi.fn(async (id: string, ownerId: string) => { const run = saved.get(id); return run?.ownerId === ownerId ? run : null; }),
    };
    const controller = new V25AcceptanceController({ marketDataUrl: "http://market-data", marketDataHeaders: () => identityHeaders, stageRuns } as never);
    const accepted = await controller.verifyMinuteImport("sq_session=" + owner, undefined, { dataVersion: imported.version });

    expect(fetch).toHaveBeenNthCalledWith(1, "http://market-data/v2/minute/imports/minute-v1", expect.objectContaining({ method: "GET", headers: identityHeaders }));
    expect(fetch).toHaveBeenNthCalledWith(2, "http://market-data/v2/minute/imports/minute-v1/bars?cursor=0&pageSize=100", expect.objectContaining({ method: "GET", headers: identityHeaders }));
    expect(accepted).toMatchObject({ accepted: true, testRunId: "11111111-1111-4111-8111-111111111111", status: "COMPLETED" });
    const run = await controller.get("sq_session=" + owner, undefined, accepted.testRunId);
    expect(run).toMatchObject({ stageId: "V2.5", scenarioId: "minute-import-query", ownerId: owner, status: "COMPLETED", evidence: { evidenceMode: "PERSISTED_MARKET_DATA_IMPORT_QUERY", researchUseAllowed: false, import: { dataVersion: "minute-v1", sha256: "a".repeat(64) }, persistedQuery: { rows: 2, nextCursor: "2" } } });
    expect(stageRuns.save).toHaveBeenCalledTimes(1);
  });

  it("rejects an absent import and does not persist a Run", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "NOT_FOUND" }, { status: 404 })));
    const save = vi.fn();
    const controller = new V25AcceptanceController({ marketDataUrl: "http://market-data", marketDataHeaders: () => identityHeaders, stageRuns: { newId: vi.fn(), save } } as never);
    await expect(controller.verifyMinuteImport("sq_session=" + owner, undefined, { dataVersion: "missing-version" })).rejects.toMatchObject({ status: 404 });
    expect(save).not.toHaveBeenCalled();
  });
});
