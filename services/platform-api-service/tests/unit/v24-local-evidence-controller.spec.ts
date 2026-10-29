import { afterEach, describe, expect, it, vi } from "vitest";
import { V24LocalEvidenceController, type PlatformContainer } from "../../src/bootstrap/app.module.js";
import { authorizeV24LocalEvidenceReader } from "../../src/application/v24-local-evidence-auth.js";
const run = "11111111-1111-4111-8111-111111111111"; const accountId = "22222222-2222-4222-8222-222222222222";
const query = { ownerId: "owner", accountId, namespace: `v24-paper-v2-${run}`, testRunId: run, targetId: "target", clientOrderId: `v24-fixture-v2-${run}-20240104`, evaluatedAt: "2024-01-04T09:31:50+08:00" };
const governanceToken = "g".repeat(40); const platformToken = "p".repeat(40);
afterEach(() => vi.unstubAllGlobals());

describe("C5 local evidence service boundary", () => {
  it("accepts only the distinct governance credential", () => {
    const input = { serviceId: "decision-governance-service", authorization: `Bearer ${governanceToken}`, governanceToken, platformToken };
    expect(authorizeV24LocalEvidenceReader(input)).toBe(true);
    expect(authorizeV24LocalEvidenceReader({ ...input, serviceId: "platform-api-service" })).toBe(false);
    expect(authorizeV24LocalEvidenceReader({ ...input, authorization: `Bearer ${platformToken}` })).toBe(false);
    expect(authorizeV24LocalEvidenceReader({ ...input, platformToken: governanceToken })).toBe(false);
    expect(authorizeV24LocalEvidenceReader({ ...input, governanceToken: "" })).toBe(false);
  });
  it("reads exact scoped target and intent, then obtains the same session's selected Market Data facts", async () => {
    const targetFind = vi.fn(async () => ({ clientOrderId: query.clientOrderId, sessionDate: "2024-01-04" }));
    const intentFind = vi.fn(async () => ({ targetId: query.targetId }));
    const fetcher = vi.fn(async (value: string | URL | Request, opts?: RequestInit) => {
      const url = new URL(String(value)); expect(url.pathname).toBe("/v2/sampling/c5-local/selection");
      expect(url.searchParams.get("testRunId")).toBe(run); expect(url.searchParams.get("sessionDate")).toBe("2024-01-04"); expect(url.searchParams.get("evaluatedAt")).toBe(query.evaluatedAt);
      expect((opts?.headers as Record<string, string>).authorization).toBe(`Bearer ${platformToken}`); expect(opts?.method ?? "GET").toBe("GET");
      return Response.json({ status: "SELECTED", planId: "plan", taskId: "task", observation: { price: "10.2500" } });
    }); vi.stubGlobal("fetch", fetcher);
    const container = { governanceServiceToken: governanceToken, portfolioToken: platformToken, marketDataUrl: "http://market.test", marketDataHeaders: () => ({ authorization: `Bearer ${platformToken}`, "x-stockquant-service-id": "platform-api-service" }), v24LocalDailyTargets: { find: targetFind }, v24LocalOrderIntents: { find: intentFind } } as unknown as PlatformContainer;
    const controller = new V24LocalEvidenceController(container);
    await expect(controller.facts(`Bearer ${governanceToken}`, "decision-governance-service", query)).resolves.toMatchObject({ selection: { status: "SELECTED", observation: { price: "10.2500" } } });
    expect(targetFind).toHaveBeenCalledWith({ ownerId: "owner", accountId, namespace: query.namespace, testRunId: run }, "target");
    await expect(controller.facts(`Bearer ${platformToken}`, "platform-api-service", query)).rejects.toMatchObject({ status: 403 });
    await expect(controller.facts(`Bearer ${governanceToken}`, "decision-governance-service", { ...query, price: "0.01" })).rejects.toMatchObject({ status: 422 });
    intentFind.mockResolvedValueOnce({ targetId: "other" });
    await expect(controller.facts(`Bearer ${governanceToken}`, "decision-governance-service", query)).rejects.toMatchObject({ status: 404 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
