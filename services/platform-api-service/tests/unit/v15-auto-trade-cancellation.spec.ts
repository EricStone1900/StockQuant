import { describe, expect, it, vi } from "vitest";
import { V15AutoTradeCancellationService } from "../../src/application/v15-auto-trade-cancellation.js";

describe("V1.5 AUTO cancellation timestamp", () => {
  it("records the request with the injected clock", async () => {
    const requestedAt = "2026-10-09T02:03:04.000Z";
    const requestV15AutoTradeCancellation = vi.fn().mockResolvedValue({
      testRunId: "run-1",
      ownerId: "owner-1",
      evidence: { autoTradeCancellation: { status: "REQUESTED", requestedAt } }
    });
    const service = new V15AutoTradeCancellationService(
      { requestV15AutoTradeCancellation } as never,
      { now: () => new Date(requestedAt) }
    );

    const run = await service.request("run-1", "owner-1");

    expect(requestV15AutoTradeCancellation).toHaveBeenCalledWith("run-1", "owner-1", requestedAt);
    expect(run.evidence.autoTradeCancellation).toEqual({ status: "REQUESTED", requestedAt });
  });
});
