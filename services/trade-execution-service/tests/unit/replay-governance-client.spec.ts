import { describe, expect, it, vi } from "vitest";
import { GeneratedReplayGovernanceClient } from "../../src/contracts/generated-replay-governance-client.js";

describe("GeneratedReplayGovernanceClient", () => {
  it("sends replay authorization validation using Trade Execution's Bearer identity", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ valid: true, replayed: false }), { status: 200 }));
    const client = new GeneratedReplayGovernanceClient("http://governance/", "t".repeat(40), request);
    const response = await client.validateHistoricalReplayExecution({ authorizationId: "grant", accountId: "00000000-0000-4000-8000-000000000001", command: { namespace: "run-1", accountId: "00000000-0000-4000-8000-000000000001", clientOrderId: "order-1", security: "600000.SH", requestedQuantity: 100, bar: { timestamp: "2026-09-30T00:00:00.000Z", open: "10.0000", volume: 1000 } } });
    expect(response.ok).toBe(true);
    expect(request).toHaveBeenCalledWith("http://governance/internal/v1/authorizations/validate", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "trade-execution-service", authorization: "Bearer " + "t".repeat(40) }) }));
  });
});
