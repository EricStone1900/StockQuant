import { afterEach, describe, expect, it, vi } from "vitest";
import { V12AcceptanceService } from "../../src/application/v12-acceptance.js";

describe("V1.2 persistent acceptance runs", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates a namespaced run and persists its completed assertions", async () => {
    const saved: any[] = [];
    const repository = {
      newId: () => "00000000-0000-4000-8000-000000000012",
      save: vi.fn(async (run: any) => { saved.push(run); return run; }),
      find: vi.fn()
    } as any;
    const marketData = {
      getV12NormalFixturePreview: vi.fn(async () => ({ barCount: 6, securityCount: 2, quality: { status: "READY", errors: [] }, bars: [], fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE" } as any)),
      getV12FutureFixturePreview: vi.fn(async () => ({ quality: { status: "REJECTED", errors: [{ code: "FUTURE_DATA" }] }, bars: [], fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE" } as any))
    };
    const quantResearch = {
      getV12QlibProbe: vi.fn(async () => ({ probe: { status: "READY" } })),
      getV12FactorPreview: vi.fn(async () => ({ ranking: [{ security: "600000.SH" }, { security: "000001.SZ" }] }))
    };

    const service = new V12AcceptanceService(repository, marketData, quantResearch);
    const accepted = await service.create("owner-a", "normal", 7);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(accepted).toMatchObject({ accepted: true, testRunId: "00000000-0000-4000-8000-000000000012", status: "RUNNING" });
    expect(saved[0]).toMatchObject({ ownerId: "owner-a", stageId: "V1.2", namespace: "v1-2-normal-00000000-0000-4000-8000-000000000012", status: "RUNNING" });
    expect(saved.at(-1)).toMatchObject({ status: "COMPLETED", assertions: expect.arrayContaining([expect.objectContaining({ assertionId: "V1.2-DATA-NORMAL-001", status: "PASS" })]) });
    expect(marketData.getV12NormalFixturePreview).toHaveBeenCalledOnce();
    expect(marketData.getV12FutureFixturePreview).toHaveBeenCalledOnce();
    expect(quantResearch.getV12QlibProbe).toHaveBeenCalledOnce();
    expect(quantResearch.getV12FactorPreview).toHaveBeenCalledOnce();
  });

  it("passes owner scope through to persistent lookup", async () => {
    const repository = { find: vi.fn(async (id: string, owner: string) => ({ testRunId: id, ownerId: owner, stageId: "V1.2" })) } as any;
    const service = new V12AcceptanceService(repository, { getV12NormalFixturePreview: vi.fn(), getV12FutureFixturePreview: vi.fn() }, { getV12QlibProbe: vi.fn(), getV12FactorPreview: vi.fn() });
    await service.find("run-1", "owner-b");
    expect(repository.find).toHaveBeenCalledWith("run-1", "owner-b");
  });
});
