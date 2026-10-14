import { describe, expect, it } from "vitest";
import { buildV13FixedAutoPaperOrder, buildV13FixedPaperOrder, buildV13FixedSequencedPaperOrder } from "../../src/application/v13-manual-execution.js";
import type { V13ProposalResult } from "../../src/contracts/generated-types.js";

const proposal = (securityId = "600000.SH", quantity = 100): V13ProposalResult => ({
  proposalId: "d8c1d600-22f6-44ab-9c2f-5581462d90a3", proposalVersion: 1, contentHash: "a".repeat(64), status: "APPROVED_MANUAL", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: "2026-10-07T10:00:00+08:00", legs: [{ legId: "leg-1", securityId, side: "BUY", quantity }], ownerId: "acceptance-owner-1", testRunId: "d8c1d600-22f6-44ab-9c2f-5581462d90a1", accountId: "d8c1d600-22f6-44ab-9c2f-5581462d90a2", strategyVersion: "fixture-manual-test-v1",
});
const input = { namespace: "fixture-run", clientOrderId: "v13-order-1", now: "2026-10-07T09:31:00+08:00" };

describe("V1.3 fixed manual Paper execution command", () => {
  it("derives the CN exact fixture and reserves notional plus fee", () => {
    expect(buildV13FixedPaperOrder({ proposal: proposal(), ...input })).toMatchObject({ security: "600000.SH", quantity: 100, currency: "CNY", price: "10.00", fee: "5.00", reservedCash: "1005.00", effectiveAt: input.now });
  });
  it("derives the independent US exact fixture", () => {
    expect(buildV13FixedPaperOrder({ proposal: proposal("AAPL", 10), ...input })).toMatchObject({ security: "AAPL", quantity: 10, currency: "USD", price: "25.00", fee: "0.05", reservedCash: "250.05" });
  });
  it("maps the fixed CN and US SELL legs to Portfolio sellability checks", () => {
    expect(buildV13FixedPaperOrder({ proposal: { ...proposal(), legs: [{ legId: "sell", securityId: "600000.SH", side: "SELL", quantity: 100 }] }, ...input })).toMatchObject({ side: "SELL", security: "600000.SH", quantity: 100, currency: "CNY" });
    expect(buildV13FixedPaperOrder({ proposal: { ...proposal("AAPL", 10), legs: [{ legId: "sell", securityId: "AAPL", side: "SELL", quantity: 10 }] }, ...input })).toMatchObject({ side: "SELL", security: "AAPL", quantity: 10, currency: "USD", price: "25.00", fee: "0.05", reservedCash: "250.05" });
    expect(() => buildV13FixedPaperOrder({ proposal: { ...proposal("MSFT", 5), legs: [{ legId: "sell", securityId: "MSFT", side: "SELL", quantity: 5 }] }, ...input })).toThrow("V13_PROPOSAL_OUTSIDE_FIXED_FIXTURE");
    const autoUs = { ...proposal("AAPL", 10), status: "AUTO_POLICY_PENDING", approvalMode: "AUTO_POLICY", strategyVersion: "fixture-auto-policy-test-v1", legs: [{ legId: "sell", securityId: "AAPL", side: "SELL", quantity: 10 }] } as V13ProposalResult;
    expect(buildV13FixedAutoPaperOrder({ proposal: autoUs, ...input, mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a4", mandateVersion: 1 })).toMatchObject({ side: "SELL", security: "AAPL", quantity: 10 });
    const auto = { ...proposal(), status: "AUTO_POLICY_PENDING", approvalMode: "AUTO_POLICY", strategyVersion: "fixture-auto-policy-test-v1", legs: [{ legId: "sell", securityId: "600000.SH", side: "SELL", quantity: 100 }] } as V13ProposalResult;
    expect(buildV13FixedAutoPaperOrder({ proposal: auto, ...input, mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a4", mandateVersion: 1 })).toMatchObject({ side: "SELL", security: "600000.SH", quantity: 100 });
  });
  it("rejects pending, expired, wrong strategy, and user-invented order terms", () => {
    expect(() => buildV13FixedPaperOrder({ proposal: { ...proposal(), status: "MANUAL_APPROVAL_PENDING" }, ...input })).toThrow("V13_PROPOSAL_NOT_EXECUTABLE");
    expect(() => buildV13FixedPaperOrder({ proposal: proposal(), ...input, now: "2026-10-07T10:00:00+08:00" })).toThrow("V13_EXECUTION_SCOPE_OR_EXPIRY_INVALID");
    expect(() => buildV13FixedPaperOrder({ proposal: { ...proposal(), strategyVersion: "other" }, ...input })).toThrow("V13_PROPOSAL_NOT_EXECUTABLE");
    expect(() => buildV13FixedPaperOrder({ proposal: proposal("600000.SH", 101), ...input })).toThrow("V13_PROPOSAL_OUTSIDE_FIXED_FIXTURE");
    expect(() => buildV13FixedPaperOrder({ proposal: { ...proposal(), legs: [proposal().legs[0], { legId: "leg-2", securityId: "000001.SZ", side: "SELL", quantity: 100 }] }, ...input })).toThrow("V13_PROPOSAL_SHAPE_INVALID");
  });
  it("binds the exact execution facts into a stable authorization hash", () => {
    const first = buildV13FixedPaperOrder({ proposal: proposal(), ...input });
    expect(buildV13FixedPaperOrder({ proposal: proposal(), ...input }).commandHash).toBe(first.commandHash);
    expect(buildV13FixedPaperOrder({ proposal: proposal(), ...input, clientOrderId: "v13-order-2" }).commandHash).not.toBe(first.commandHash);
  });
});

describe("V1.3 fixed AUTO_POLICY Paper execution command", () => {
  it("accepts only a persisted AUTO_POLICY pending proposal and binds the exact Mandate into the order hash", () => {
    const autoProposal = { ...proposal(), status: "AUTO_POLICY_PENDING", approvalMode: "AUTO_POLICY", strategyVersion: "fixture-auto-policy-test-v1" } as V13ProposalResult;
    const command = buildV13FixedAutoPaperOrder({ proposal: autoProposal, ...input, mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a4", mandateVersion: 1 });
    expect(command).toMatchObject({ approvalMode: "AUTO_POLICY", strategyVersion: "fixture-auto-policy-test-v1", mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a4", reservedCash: "1005.00" });
    expect(() => buildV13FixedAutoPaperOrder({ proposal: proposal(), ...input, mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a4", mandateVersion: 1 })).toThrow("V13_PROPOSAL_NOT_EXECUTABLE");
    expect(() => buildV13FixedAutoPaperOrder({ proposal: autoProposal, ...input, mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a4", mandateVersion: 1, clientOrderId: "v13-order-2" })).not.toThrow();
    expect(buildV13FixedAutoPaperOrder({ proposal: autoProposal, ...input, mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a4", mandateVersion: 1 }).commandHash).not.toBe(buildV13FixedAutoPaperOrder({ proposal: autoProposal, ...input, mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a5", mandateVersion: 1 }).commandHash);
  });
  it("accepts only the frozen reduced AUTO quantities used by V1.5 multi-session runs", () => {
    const cn = { ...proposal(), status: "AUTO_POLICY_PENDING", approvalMode: "AUTO_POLICY", strategyVersion: "fixture-auto-policy-test-v1", legs: [{ legId: "buy", securityId: "600000.SH", side: "BUY", quantity: 50 }] } as V13ProposalResult;
    const us = { ...proposal("AAPL", 10), status: "AUTO_POLICY_PENDING", approvalMode: "AUTO_POLICY", strategyVersion: "fixture-auto-policy-test-v1", legs: [{ legId: "buy", securityId: "AAPL", side: "BUY", quantity: 5 }] } as V13ProposalResult;
    expect(buildV13FixedAutoPaperOrder({ proposal: cn, ...input, mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a4", mandateVersion: 1 }).reservedCash).toBe("505.00");
    expect(buildV13FixedAutoPaperOrder({ proposal: us, ...input, mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a4", mandateVersion: 1 }).reservedCash).toBe("125.05");
    expect(() => buildV13FixedAutoPaperOrder({ proposal: { ...cn, legs: [{ ...cn.legs[0]!, quantity: 49 }] }, ...input, mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a4", mandateVersion: 1 })).toThrow("V13_PROPOSAL_OUTSIDE_FIXED_FIXTURE");
  });
});

describe("V1.3 fixed sequenced FakeBroker event fixture", () => {
  it("accepts only the fixed 100-share partial-fill-and-cancel fixture for L08", () => {
    const command = buildV13FixedSequencedPaperOrder({ proposal: proposal("600000.SH", 100), ...input });
    expect(command).toMatchObject({ quantity: 100, price: "10.00", fee: "5.00", reservedCash: "1005.00", executionMode: "SEQUENCED" });
  });
  it("allows only the approved 200-share CN manual event-sequence fixture", () => {
    const command = buildV13FixedSequencedPaperOrder({ proposal: proposal("600000.SH", 200), ...input });
    expect(command).toMatchObject({ executionMode: "SEQUENCED", security: "600000.SH", side: "BUY", quantity: 200, currency: "CNY", price: "10.00", fee: "5.00", reservedCash: "2005.00" });
    expect(command.commandHash).not.toBe(buildV13FixedPaperOrder({ proposal: { ...proposal("600000.SH", 100), legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }] }, ...input }).commandHash);
  });
  it("allows only the approved 200-share US AAPL manual event-sequence fixture", () => {
    const command = buildV13FixedSequencedPaperOrder({ proposal: proposal("AAPL", 200), ...input });
    expect(command).toMatchObject({ executionMode: "SEQUENCED", security: "AAPL", side: "BUY", quantity: 200, currency: "USD", price: "25.00", fee: "0.05", reservedCash: "5000.05" });
  });
  it("fails closed for immediate 200-share orders, unsupported sequenced securities, and sequenced SELL proposals", () => {
    expect(() => buildV13FixedPaperOrder({ proposal: proposal("600000.SH", 200), ...input })).toThrow("V13_PROPOSAL_OUTSIDE_FIXED_FIXTURE");
    expect(() => buildV13FixedSequencedPaperOrder({ proposal: proposal("MSFT", 200), ...input })).toThrow("V13_PROPOSAL_OUTSIDE_FIXED_FIXTURE");
    expect(() => buildV13FixedSequencedPaperOrder({ proposal: proposal("AAPL", 10), ...input })).toThrow("V13_PROPOSAL_OUTSIDE_FIXED_FIXTURE");
    expect(() => buildV13FixedSequencedPaperOrder({ proposal: { ...proposal("600000.SH", 200), legs: [{ legId: "leg-1", securityId: "600000.SH", side: "SELL", quantity: 200 }] }, ...input })).toThrow("V13_PROPOSAL_OUTSIDE_FIXED_FIXTURE");
  });
});
