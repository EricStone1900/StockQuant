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
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("normal/preview")) return new Response(JSON.stringify({ barCount: 6, securityCount: 2, quality: { status: "READY" } }), { status: 200 });
      if (url.endsWith("bad-future/preview")) return new Response(JSON.stringify({ quality: { status: "REJECTED", errors: [{ code: "FUTURE_DATA" }] } }), { status: 200 });
      if (url.endsWith("qlib/probe")) return new Response(JSON.stringify({ probe: { status: "READY" } }), { status: 200 });
      return new Response(JSON.stringify({ ranking: [{ security: "600000.SH" }, { security: "000001.SZ" }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = new V12AcceptanceService(repository, "http://market", "http://quant", "quant-platform-token", "market-platform-token");
    const accepted = await service.create("owner-a", "normal", 7);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(accepted).toMatchObject({ accepted: true, testRunId: "00000000-0000-4000-8000-000000000012", status: "RUNNING" });
    expect(saved[0]).toMatchObject({ ownerId: "owner-a", stageId: "V1.2", namespace: "v1-2-normal-00000000-0000-4000-8000-000000000012", status: "RUNNING" });
    expect(saved.at(-1)).toMatchObject({ status: "COMPLETED", assertions: expect.arrayContaining([expect.objectContaining({ assertionId: "V1.2-DATA-NORMAL-001", status: "PASS" })]) });
    expect(fetchMock).toHaveBeenCalledWith("http://market/v1/fixtures/normal/preview", { headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer market-platform-token" } });
    expect(fetchMock).toHaveBeenCalledWith("http://market/v1/fixtures/bad-future/preview", { headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer market-platform-token" } });
  });

  it("passes owner scope through to persistent lookup", async () => {
    const repository = { find: vi.fn(async (id: string, owner: string) => ({ testRunId: id, ownerId: owner, stageId: "V1.2" })) } as any;
    const service = new V12AcceptanceService(repository, "http://market", "http://quant");
    await service.find("run-1", "owner-b");
    expect(repository.find).toHaveBeenCalledWith("run-1", "owner-b");
  });
});
