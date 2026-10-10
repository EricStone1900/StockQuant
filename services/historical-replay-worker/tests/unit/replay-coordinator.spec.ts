import { describe, expect, it, vi } from "vitest";
import { createReplayCoordinator } from "../../src/application/replay-coordinator.js";

describe("historical replay coordinator", () => {
  it("recovers UNKNOWN by reading the original order and never resending it", async () => {
    const orderId = "original-order-123";
    const saved: unknown[] = [];
    const runs = {
      find: vi.fn().mockResolvedValue({ namespace: "namespace-1", result: { execution: { result: { orderId } } } }),
      saveResult: vi.fn(async (_testRunId: string, result: unknown) => { saved.push(result); }),
      withRunLock: vi.fn(),
    };
    const tradeExecutionClient = {
      readHistoricalFakeOrderById: vi.fn().mockResolvedValue({ status: "UNKNOWN" }),
      executeHistoricalFakeOrder: vi.fn(),
    };
    const coordinator = createReplayCoordinator({
      runs: runs as never,
      portfolioClient: {} as never,
      tradeExecutionClient: tradeExecutionClient as never,
      replayDependencies: {} as never,
    });

    const result = await coordinator.recoverUnknown("test-run-1");

    expect(tradeExecutionClient.readHistoricalFakeOrderById).toHaveBeenCalledExactlyOnceWith(orderId, "namespace-1");
    expect(tradeExecutionClient.executeHistoricalFakeOrder).not.toHaveBeenCalled();
    expect(result).toMatchObject({ unknownRecovery: { observedStatus: "UNKNOWN", action: "MANUAL_REVIEW_REQUIRED" } });
    expect(saved).toHaveLength(1);
  });

  it("fails closed when the persisted replay namespace is missing", async () => {
    const runs = { find: vi.fn().mockResolvedValue({ result: { execution: { result: { orderId: "original-order-123" } } } }), withRunLock: vi.fn() };
    const tradeExecutionClient = { readHistoricalFakeOrderById: vi.fn(), executeHistoricalFakeOrder: vi.fn() };
    const coordinator = createReplayCoordinator({ runs: runs as never, portfolioClient: {} as never, tradeExecutionClient: tradeExecutionClient as never, replayDependencies: {} as never });

    await expect(coordinator.recoverUnknown("test-run-1")).rejects.toThrow("replay run namespace is not available");
    expect(tradeExecutionClient.readHistoricalFakeOrderById).not.toHaveBeenCalled();
    expect(tradeExecutionClient.executeHistoricalFakeOrder).not.toHaveBeenCalled();
  });

  it("keeps the persisted request fingerprint out of the public run representation", async () => {
    const runs = {
      find: vi.fn().mockResolvedValue({ testRunId: "id", requestHash: "private-fingerprint", status: "COMPLETED" }),
      withRunLock: vi.fn(),
    };
    const coordinator = createReplayCoordinator({ runs: runs as never, portfolioClient: {} as never, tradeExecutionClient: {} as never, replayDependencies: {} as never });

    const result = await coordinator.getRun("id");

    expect(result).toEqual({ testRunId: "id", status: "COMPLETED" });
    expect(result).not.toHaveProperty("requestHash");
  });
});
