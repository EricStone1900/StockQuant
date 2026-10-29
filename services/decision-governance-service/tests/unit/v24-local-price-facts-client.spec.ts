import { describe, expect, it, vi } from "vitest";
import { readV24LocalPriceEvidence } from "../../src/adapters/v24-local-price-facts-client.js";
const run = "11111111-1111-4111-8111-111111111111";
const scope = { ownerId: "owner", accountId: "22222222-2222-4222-8222-222222222222", namespace: `v24-paper-v2-${run}`, testRunId: run };
const clientOrderId = `v24-fixture-v2-${run}-20240104`; const token = "g".repeat(40);
const query = { platformUrl: "http://platform.test", governanceToken: token, scope, targetId: "target", clientOrderId, evaluatedAt: "2024-01-04T09:31:50+08:00" };
function facts() {
  return { target: { ...scope, targetId: "target", clientOrderId, dataMode: "FIXTURE", fixtureSha256: "96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea", strategySha256: "2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8", sessionDate: "2024-01-04", evaluationAt: "2024-01-04T09:31:00+08:00", input: { referencePrice: "10.2500" }, decision: { action: "BUY", quantity: 100 }, dailyBarProvenance: { completionIds: ["one", "two"] } }, intent: { ...scope, targetId: "target", clientOrderId, security: "600000.SH", side: "BUY", quantity: 100, status: "ACCEPTED_INTENT", acceptedAt: "2024-01-04T09:31:00+08:00" }, selection: { status: "SELECTED", planId: "plan", taskId: "task", observation: { snapshotId: "snapshot", securityId: "600000.SH", dataMode: "FIXTURE", status: "READY", price: "10.2500", observedAt: "2024-01-04T09:31:10+08:00", ingestedAt: "2024-01-04T09:31:11+08:00" } } };
}
describe("C5 governance read-only price facts client", () => {
  it("uses the dedicated service credential and derives the exact budget from returned facts", async () => {
    const request = vi.fn(async (value: string | URL | Request, options?: RequestInit) => {
      const url = new URL(String(value)); expect(url.pathname).toBe("/internal/v1/c5-local/price-facts"); expect(url.searchParams.get("testRunId")).toBe(run); expect(url.searchParams.get("evaluatedAt")).toBe(query.evaluatedAt);
      expect(options?.method).toBe("GET"); expect((options?.headers as Record<string, string>)["x-stockquant-service-id"]).toBe("decision-governance-service"); expect((options?.headers as Record<string, string>).authorization).toBe(`Bearer ${token}`);
      return Response.json(facts());
    });
    await expect(readV24LocalPriceEvidence({ ...query, request: request as typeof fetch })).resolves.toMatchObject({ price: "10.25", budgetAmount: "1030.00", snapshotId: "snapshot" });
    expect(request).toHaveBeenCalledOnce();
  });
  it("fails closed on missing facts and forged target scope", async () => {
    await expect(readV24LocalPriceEvidence({ ...query, request: (async () => new Response("{}", { status: 409 })) as typeof fetch })).rejects.toThrow("FACTS_UNAVAILABLE");
    const wrong = facts(); wrong.target.ownerId = "foreign";
    await expect(readV24LocalPriceEvidence({ ...query, request: (async () => Response.json(wrong)) as typeof fetch })).rejects.toThrow("SCOPE_MISMATCH");
  });
});
