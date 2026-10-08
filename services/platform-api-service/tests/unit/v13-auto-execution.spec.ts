import { describe, expect, it, vi } from "vitest";
import { executeV13AutoProposal, V13AutoExecutionError, type V13AutoExecutionPorts } from "../../src/application/v13-auto-execution.js";

const command = { ownerId: "owner-1", testRunId: "11111111-1111-4111-8111-111111111111", proposalId: "22222222-2222-4222-8222-222222222222", mandateId: "33333333-3333-4333-8333-333333333333", mandateVersion: 1, clientOrderId: "order-1" };
function ports(overrides: Partial<V13AutoExecutionPorts> = {}): V13AutoExecutionPorts {
  return {
    findRun: vi.fn(async () => ({ stageId: "V1.3", namespace: "v13-normal-run", evidence: { runClockNow: "2026-09-28T09:31:00+08:00" } })),
    readProposal: vi.fn(async () => ({ status: 200, body: { ownerId: command.ownerId, testRunId: command.testRunId, approvalMode: "AUTO_POLICY", status: "AUTO_POLICY_PENDING", accountId: "account-1" } })),
    readAccount: vi.fn(async () => ({ testRunId: command.testRunId, namespace: "v13-normal-run", environmentMode: "PAPER", brokerMode: "FAKE" })),
    executeTrade: vi.fn(async () => ({ status: 202, body: { accepted: true, clientOrderId: command.clientOrderId } })),
    ...overrides,
  };
}

describe("V1.3 AUTO_POLICY execution application service", () => {
  it("revalidates owner, TestRun, PAPER/FAKE account scope and injected Clock before execution", async () => {
    const p = ports();
    await expect(executeV13AutoProposal(command, p)).resolves.toEqual({ accepted: true, clientOrderId: "order-1" });
    expect(p.readProposal).toHaveBeenCalledWith(command.proposalId, command.ownerId);
    expect(p.readAccount).toHaveBeenCalledWith("account-1", command.ownerId);
    expect(p.executeTrade).toHaveBeenCalledWith({ ...command, accountId: "account-1", namespace: "v13-normal-run", now: "2026-09-28T09:31:00+08:00" });
  });

  it("rejects a proposal from another owner or Run without calling Trade", async () => {
    const p = ports({ readProposal: vi.fn(async () => ({ status: 200, body: { ownerId: "other", testRunId: command.testRunId, approvalMode: "AUTO_POLICY", status: "AUTO_POLICY_PENDING", accountId: "account-1" } })) });
    await expect(executeV13AutoProposal(command, p)).rejects.toMatchObject<V13AutoExecutionError>({ status: 403 });
    expect(p.readAccount).not.toHaveBeenCalled();
    expect(p.executeTrade).not.toHaveBeenCalled();
  });

  it("rejects a non-FAKE or cross-namespace account without calling Trade", async () => {
    const p = ports({ readAccount: vi.fn(async () => ({ testRunId: command.testRunId, namespace: "other-run", environmentMode: "PAPER", brokerMode: "FAKE" })) });
    await expect(executeV13AutoProposal(command, p)).rejects.toMatchObject<V13AutoExecutionError>({ status: 403 });
    expect(p.executeTrade).not.toHaveBeenCalled();
  });

  it("maps only stable business rejection statuses and leaves infrastructure errors as 503", async () => {
    const rejected = ports({ executeTrade: vi.fn(async () => ({ status: 409, body: { reason: "idempotency conflict" } })) });
    await expect(executeV13AutoProposal(command, rejected)).rejects.toMatchObject<V13AutoExecutionError>({ status: 409, body: { reason: "idempotency conflict" } });
    const unavailable = ports({ executeTrade: vi.fn(async () => ({ status: 500 })) });
    await expect(executeV13AutoProposal(command, unavailable)).rejects.toMatchObject<V13AutoExecutionError>({ status: 503 });
  });

  it("rejects malformed Mandate and order identity before any dependency call", async () => {
    const p = ports();
    await expect(executeV13AutoProposal({ ...command, mandateVersion: 0 }, p)).rejects.toMatchObject<V13AutoExecutionError>({ status: 422 });
    expect(p.findRun).not.toHaveBeenCalled();
  });
});
