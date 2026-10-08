import { describe, expect, it, vi } from "vitest";
import { executeV13ManualProposal, V13ManualExecutionError, type V13ManualExecutionPorts } from "../../src/application/v13-manual-execution.js";

const cmd = { ownerId: "owner-a", testRunId: "run-a", proposalId: "proposal-a", clientOrderId: "order-a" };
function ports(overrides: Partial<V13ManualExecutionPorts> = {}): V13ManualExecutionPorts {
  return {
    findRun: vi.fn(async () => ({ stageId: "V1.3", namespace: "ns-a", evidence: { runClockNow: "2026-09-28T09:31:00+08:00" } })),
    readProposal: vi.fn(async () => ({ status: 200, body: { ownerId: cmd.ownerId, testRunId: cmd.testRunId, accountId: "account-a" } })),
    readAccount: vi.fn(async () => ({ testRunId: cmd.testRunId, namespace: "ns-a", environmentMode: "PAPER", brokerMode: "FAKE" })),
    executeTrade: vi.fn(async () => ({ status: 202, body: { accepted: true } })),
    ...overrides,
  };
}

describe("V1.3 manual execution application service", () => {
  it("validates owner scope and forwards the TestRun clock to Trade", async () => {
    const p = ports();
    await expect(executeV13ManualProposal(cmd, p)).resolves.toEqual({ accepted: true });
    expect(p.executeTrade).toHaveBeenCalledWith(expect.objectContaining({ accountId: "account-a", namespace: "ns-a", now: "2026-09-28T09:31:00+08:00" }));
  });
  it("hides cross-owner or cross-run proposals before account and Trade calls", async () => {
    const p = ports({ readProposal: vi.fn(async () => ({ status: 200, body: { ownerId: "other", testRunId: cmd.testRunId, accountId: "account-a" } })) });
    await expect(executeV13ManualProposal(cmd, p)).rejects.toMatchObject<V13ManualExecutionError>({ status: 404 });
    expect(p.readAccount).not.toHaveBeenCalled(); expect(p.executeTrade).not.toHaveBeenCalled();
  });
  it("rejects non-FAKE or out-of-namespace accounts", async () => {
    const p = ports({ readAccount: vi.fn(async () => ({ testRunId: cmd.testRunId, namespace: "other", environmentMode: "PAPER", brokerMode: "FAKE" })) });
    await expect(executeV13ManualProposal(cmd, p)).rejects.toMatchObject<V13ManualExecutionError>({ status: 403 });
    expect(p.executeTrade).not.toHaveBeenCalled();
  });
  it("preserves business rejection and reports infrastructure failure", async () => {
    const rejected = ports({ executeTrade: vi.fn(async () => ({ status: 409, body: { reason: "conflict" } })) });
    await expect(executeV13ManualProposal(cmd, rejected)).rejects.toMatchObject<V13ManualExecutionError>({ status: 409, body: { reason: "conflict" } });
    const down = ports({ executeTrade: vi.fn(async () => ({ status: 503 })) });
    await expect(executeV13ManualProposal(cmd, down)).rejects.toMatchObject<V13ManualExecutionError>({ status: 503 });
  });
  it("requires bounded stable idempotency key and a valid injected run clock", async () => {
    const p = ports();
    await expect(executeV13ManualProposal({ ...cmd, clientOrderId: " " }, p)).rejects.toMatchObject({ status: 422 });
    const noClock = ports({ findRun: vi.fn(async () => ({ stageId: "V1.3", namespace: "ns-a", evidence: {} })) });
    await expect(executeV13ManualProposal(cmd, noClock)).rejects.toMatchObject({ status: 404 });
    expect(p.findRun).not.toHaveBeenCalled();
  });
});
