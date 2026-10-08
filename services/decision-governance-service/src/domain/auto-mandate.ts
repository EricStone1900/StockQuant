const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const HASH = /^[a-f0-9]{64}$/u;
const timestamp = (value: string) => /(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ? Date.parse(value) : Number.NaN;

export type AutoMandate = {
  mandateId: string; mandateVersion: number; contentHash: string; ownerId: string; testRunId: string; accountId: string;
  strategyVersion: string; market: "CN_A" | "US_EQUITY"; currency: "CNY" | "USD"; securityScope: string[];
  maxOrderAmount: string; maxTotalAmount: string; maxOrderCount: number; validFrom: string; expiresAt: string;
  status: "ACTIVE" | "PAUSED" | "REVOKED";
};

export type AutoMandateDecision = { proposalId: string; proposalVersion: number; contentHash: string; ownerId: string; testRunId: string; accountId: string; strategyVersion: string; operation: "HOLD" | "REBALANCE"; market: string; currency: string; legs: Array<{ securityId: string; side: "BUY" | "SELL"; quantity: number; limitPrice: string; estimatedFee?: string }> };

export type AutoMandateResult =
  | { status: "AUTHORIZED"; mandateId: string; mandateVersion: number; proposalId: string; proposalVersion: number; contentHash: string; reservedAmount: string; orderCount: number }
  | { status: "HOLD"; mandateId: string; mandateVersion: number; reservedAmount: "0.00"; orderCount: number }
  | { status: "REJECTED"; reasonCode: "INVALID_INPUT" | "SCOPE_MISMATCH" | "MANDATE_INACTIVE" | "MANDATE_NOT_YET_VALID" | "MANDATE_EXPIRED" | "SECURITY_OUT_OF_SCOPE" | "CURRENCY_MISMATCH" | "INVALID_ORDER" | "ORDER_LIMIT_EXCEEDED" | "BUDGET_EXCEEDED" };

function cents(value: string): bigint | null {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

/** Deterministic evaluation for a single versioned AUTO_POLICY mandate; persistence and budget reservation are adapter responsibilities. */
export function evaluateAutoMandate(input: { mandate: AutoMandate; proposal: AutoMandateDecision; now: string; acceptedOrReservedAmount: string; acceptedOrderCount: number }): AutoMandateResult {
  const { mandate, proposal } = input;
  if (!mandate || !proposal || !Number.isSafeInteger(mandate.mandateVersion) || mandate.mandateVersion < 1 || !HASH.test(mandate.contentHash) || !UUID.test(mandate.testRunId) || !UUID.test(mandate.accountId) || !mandate.ownerId?.trim() || !mandate.strategyVersion?.trim() || !Array.isArray(mandate.securityScope) || !mandate.securityScope.length || !Number.isSafeInteger(mandate.maxOrderCount) || mandate.maxOrderCount < 1 || !Number.isSafeInteger(input.acceptedOrderCount) || input.acceptedOrderCount < 0 || !Number.isFinite(timestamp(input.now)) || !Number.isFinite(timestamp(mandate.validFrom)) || !Number.isFinite(timestamp(mandate.expiresAt))) return { status: "REJECTED", reasonCode: "INVALID_INPUT" };
  if (proposal.ownerId !== mandate.ownerId || proposal.testRunId !== mandate.testRunId || proposal.accountId !== mandate.accountId || proposal.strategyVersion !== mandate.strategyVersion || proposal.market !== mandate.market) return { status: "REJECTED", reasonCode: "SCOPE_MISMATCH" };
  if (proposal.currency !== mandate.currency) return { status: "REJECTED", reasonCode: "CURRENCY_MISMATCH" };
  if (mandate.status !== "ACTIVE") return { status: "REJECTED", reasonCode: "MANDATE_INACTIVE" };
  if (timestamp(input.now) < timestamp(mandate.validFrom)) return { status: "REJECTED", reasonCode: "MANDATE_NOT_YET_VALID" };
  if (timestamp(input.now) >= timestamp(mandate.expiresAt)) return { status: "REJECTED", reasonCode: "MANDATE_EXPIRED" };
  const used = cents(input.acceptedOrReservedAmount); const perOrder = cents(mandate.maxOrderAmount); const total = cents(mandate.maxTotalAmount);
  if (used === null || perOrder === null || total === null) return { status: "REJECTED", reasonCode: "INVALID_INPUT" };
  if (proposal.operation === "HOLD") return proposal.legs.length === 0 ? { status: "HOLD", mandateId: mandate.mandateId, mandateVersion: mandate.mandateVersion, reservedAmount: "0.00", orderCount: input.acceptedOrderCount } : { status: "REJECTED", reasonCode: "INVALID_ORDER" };
  if (proposal.operation !== "REBALANCE" || !proposal.proposalId || !Number.isSafeInteger(proposal.proposalVersion) || proposal.proposalVersion < 1 || !HASH.test(proposal.contentHash) || !proposal.legs.length || proposal.currency !== mandate.currency || !Number.isSafeInteger(input.acceptedOrderCount)) return { status: "REJECTED", reasonCode: proposal.currency !== mandate.currency ? "CURRENCY_MISMATCH" : "INVALID_ORDER" };
  if (input.acceptedOrderCount >= mandate.maxOrderCount) return { status: "REJECTED", reasonCode: "ORDER_LIMIT_EXCEEDED" };
  let amount = 0n;
  for (const leg of proposal.legs) {
    const price = cents(leg.limitPrice); const fee = cents(leg.estimatedFee ?? "0.00");
    if (!leg.securityId || !mandate.securityScope.includes(leg.securityId)) return { status: "REJECTED", reasonCode: "SECURITY_OUT_OF_SCOPE" };
    if (!Number.isSafeInteger(leg.quantity) || leg.quantity <= 0 || !["BUY", "SELL"].includes(leg.side) || price === null || price <= 0n || fee === null) return { status: "REJECTED", reasonCode: "INVALID_ORDER" };
    amount += price * BigInt(leg.quantity) + fee;
  }
  if (amount > perOrder || used + amount > total) return { status: "REJECTED", reasonCode: "BUDGET_EXCEEDED" };
  return { status: "AUTHORIZED", mandateId: mandate.mandateId, mandateVersion: mandate.mandateVersion, proposalId: proposal.proposalId, proposalVersion: proposal.proposalVersion, contentHash: proposal.contentHash, reservedAmount: `${amount / 100n}.${(amount % 100n).toString().padStart(2, "0")}`, orderCount: input.acceptedOrderCount + 1 };
}
