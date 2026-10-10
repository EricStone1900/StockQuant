import { createHash } from "node:crypto";
import type { V13ProposalResult } from "../contracts/generated-types.js";

export type V13FixedPaperOrder = {
  proposalId: string; proposalVersion: number; contentHash: string; ownerId: string; testRunId: string; accountId: string;
  strategyVersion: string; approvalMode: "MANUAL_APPROVAL" | "AUTO_POLICY"; mandateId?: string; mandateVersion?: number;
  namespace: string; clientOrderId: string; security: string; side: "BUY" | "SELL"; quantity: number; currency: "CNY" | "USD";
  price: string; fee: string; reservedCash: string; effectiveAt: string; commandHash: string; executionMode: "IMMEDIATE" | "SEQUENCED";
};

const fixtures = {
  "600000.SH": { quantity: 100, currency: "CNY" as const, price: "10.00", fee: "5.00" },
  "000001.SZ": { quantity: 100, currency: "CNY" as const, price: "12.00", fee: "5.00" },
  AAPL: { quantity: 10, currency: "USD" as const, price: "25.00", fee: "0.05" },
  MSFT: { quantity: 5, currency: "USD" as const, price: "40.00", fee: "0.05" },
};
const addMoney = (left: string, right: string) => {
  const [lw, lf = ""] = left.split("."); const [rw, rf = ""] = right.split(".");
  const amount = BigInt(`${lw}${lf.padEnd(2, "0")}`) + BigInt(`${rw}${rf.padEnd(2, "0")}`);
  return `${amount / 100n}.${(amount % 100n).toString().padStart(2, "0")}`;
};
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}` : JSON.stringify(value);

/** Converts an approved one-leg V1.3 Proposal into only the exact frozen software Fixture command. */
function buildFixedPaperOrder(input: { proposal: V13ProposalResult; namespace: string; clientOrderId: string; now: string; mandate?: { mandateId: string; mandateVersion: number }; executionMode?: "IMMEDIATE" | "SEQUENCED" }): V13FixedPaperOrder {
  const { proposal, namespace, clientOrderId, now } = input;
  const auto = input.mandate !== undefined;
  if ((auto && (proposal.status !== "AUTO_POLICY_PENDING" || proposal.approvalMode !== "AUTO_POLICY" || proposal.strategyVersion !== "fixture-auto-policy-test-v1")) || (!auto && (proposal.status !== "APPROVED_MANUAL" || proposal.approvalMode === "AUTO_POLICY" || proposal.strategyVersion !== "fixture-manual-test-v1")) || proposal.operation !== "REBALANCE" || proposal.environmentMode !== "PAPER" || proposal.brokerMode !== "FAKE") throw new Error("V13_PROPOSAL_NOT_EXECUTABLE");
  if (!proposal.ownerId || !proposal.testRunId || !proposal.accountId || !namespace || !clientOrderId.trim() || !Number.isFinite(Date.parse(now)) || Date.parse(now) >= Date.parse(proposal.expiresAt)) throw new Error("V13_EXECUTION_SCOPE_OR_EXPIRY_INVALID");
  if (!/^[a-f0-9]{64}$/u.test(proposal.contentHash) || proposal.proposalVersion < 1 || proposal.legs.length !== 1) throw new Error("V13_PROPOSAL_SHAPE_INVALID");
  const leg = proposal.legs[0];
  const baseFixture = fixtures[leg.securityId as keyof typeof fixtures];
  const fixture = baseFixture && (
    (input.executionMode === "SEQUENCED" && !auto && leg.securityId === "600000.SH" && [100, 200].includes(leg.quantity))
    || (input.executionMode === "SEQUENCED" && auto && ((leg.securityId === "600000.SH" && [50, 100].includes(leg.quantity)) || (leg.securityId === "AAPL" && [5, 10].includes(leg.quantity))))
    || (auto && ((leg.securityId === "600000.SH" && [50, 100].includes(leg.quantity)) || (leg.securityId === "AAPL" && [5, 10].includes(leg.quantity))))
  ) ? { ...baseFixture, quantity: leg.quantity } : baseFixture;
  if (!fixture || (leg.side !== "BUY" && leg.side !== "SELL") || (leg.side === "SELL" && (auto || fixture.currency !== "CNY" || leg.securityId !== "600000.SH")) || leg.quantity !== fixture.quantity || (input.executionMode === "SEQUENCED" && (leg.side !== "BUY" || (!auto && leg.securityId !== "600000.SH")))) throw new Error("V13_PROPOSAL_OUTSIDE_FIXED_FIXTURE");
  const notionalMinor = BigInt(fixture.price.replace(".", "")) * BigInt(fixture.quantity);
  const notional = `${notionalMinor / 100n}.${(notionalMinor % 100n).toString().padStart(2, "0")}`;
  const reservedCash = addMoney(notional, fixture.fee);
  const facts = { proposalId: proposal.proposalId, proposalVersion: proposal.proposalVersion, contentHash: proposal.contentHash, ownerId: proposal.ownerId, testRunId: proposal.testRunId, accountId: proposal.accountId, strategyVersion: proposal.strategyVersion, approvalMode: auto ? "AUTO_POLICY" as const : "MANUAL_APPROVAL" as const, ...(input.mandate ? input.mandate : {}), namespace, clientOrderId, security: leg.securityId, side: leg.side, quantity: fixture.quantity, currency: fixture.currency, price: fixture.price, fee: fixture.fee, reservedCash, effectiveAt: now, executionMode: input.executionMode ?? "IMMEDIATE" };
  return { ...facts, commandHash: createHash("sha256").update(canonical(facts)).digest("hex") };
}

export function buildV13FixedPaperOrder(input: { proposal: V13ProposalResult; namespace: string; clientOrderId: string; now: string }): V13FixedPaperOrder { return buildFixedPaperOrder({ ...input, executionMode: "IMMEDIATE" }); }
export function buildV13FixedSequencedPaperOrder(input: { proposal: V13ProposalResult; namespace: string; clientOrderId: string; now: string }): V13FixedPaperOrder { return buildFixedPaperOrder({ ...input, executionMode: "SEQUENCED" }); }
export function buildV13FixedAutoPaperOrder(input: { proposal: V13ProposalResult; namespace: string; clientOrderId: string; now: string; mandateId: string; mandateVersion: number; executionMode?: "IMMEDIATE" | "SEQUENCED" }): V13FixedPaperOrder {
  if (!/^[0-9a-f-]{36}$/iu.test(input.mandateId) || !Number.isSafeInteger(input.mandateVersion) || input.mandateVersion < 1) throw new Error("V13_AUTO_MANDATE_SCOPE_INVALID");
  return buildFixedPaperOrder({ ...input, mandate: { mandateId: input.mandateId, mandateVersion: input.mandateVersion }, executionMode: input.executionMode ?? "IMMEDIATE" });
}
