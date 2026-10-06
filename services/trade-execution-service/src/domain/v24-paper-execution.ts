import { assessV24SnapshotRisk } from "./v24-snapshot-risk.js";
import { selectFirstQualifyingSnapshot, type Clock, type Snapshot, type SnapshotEligibility } from "./snapshot-execution.js";

export type V24PaperExecutionGrant = {
  scenarioId: string; scenarioVersion: string; testRunId: string; ownerId: string; namespace: string; accountId: string; clockNow: string;
  dataMode: "FIXTURE"; environmentMode: "PAPER"; brokerMode: "FAKE"; liveTradingEnabled: false; market: "CN_A"; currency: "CNY";
  policy: { policyId: string; policyVersion: string; riskPolicyVersion: string; feePolicyVersion: string; maxDeviationBps: number; freshnessLimitSeconds: number; executionWindowStart: string; executionWindowEnd: string };
  mandate: { mandateId: string; mandateVersion: string; strategyVersion: string; securityScope: string[]; maxOrderNotional: string; maxGrossExposure: string; maxDailyTurnover: string; approvalEvidenceRef: string };
  signal: { signalId: string; asOf: string; action: "BUY"; quantity: number; referencePrice: string };
  order: { clientOrderId: string; security: string; acceptedAt: string; requestedQuantity: number };
  snapshot: Snapshot;
  fee: string;
};

export type V24PaperEvaluation =
  | { status: "ELIGIBLE"; snapshot: Snapshot; risk: { quoteAgeSeconds: number; deviationBps: number }; reservedCash: string; executionModel: "SNAPSHOT"; policyVersion: string }
  | { status: "WAITING"; reason: string }
  | { status: "REJECTED"; reason: string }
  | { status: "BLOCKED"; reason: string };

const toTicks = (value: string): bigint | null => {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(`${whole}${fraction.padEnd(4, "0")}`);
};
const fromTicks = (value: bigint) => `${value / 10000n}.${(value % 10000n).toString().padStart(4, "0")}`;

export function evaluateV24PaperFixtureGrant(grant: V24PaperExecutionGrant, clock: Clock): V24PaperEvaluation {
  if (grant.environmentMode !== "PAPER" || grant.brokerMode !== "FAKE" || grant.liveTradingEnabled || grant.dataMode !== "FIXTURE") return { status: "REJECTED", reason: "PAPER_FAKE_FIXTURE_REQUIRED" };
  if (grant.scenarioId !== "v24-isolated-snapshot-paper-normal" || grant.scenarioVersion !== "2.0.0" || grant.market !== "CN_A" || grant.currency !== "CNY") return { status: "REJECTED", reason: "UNSUPPORTED_FIXTURE_SCOPE" };
  if (grant.order.requestedQuantity !== grant.signal.quantity || grant.order.security !== grant.snapshot.security || !grant.mandate.securityScope.includes(grant.order.security)) return { status: "REJECTED", reason: "MANDATE_ORDER_SCOPE_MISMATCH" };
  const eligibility: SnapshotEligibility = selectFirstQualifyingSnapshot({
    mode: { environmentMode: grant.environmentMode, brokerMode: grant.brokerMode, liveTradingEnabled: grant.liveTradingEnabled },
    order: { security: grant.order.security, market: grant.market, acceptedAt: grant.order.acceptedAt, executionWindowStart: grant.policy.executionWindowStart, executionWindowEnd: grant.policy.executionWindowEnd },
    snapshots: [grant.snapshot], clock
  });
  if (eligibility.status === "WAITING") return { status: "WAITING", reason: eligibility.reason };
  if (eligibility.status === "REJECTED") return { status: "REJECTED", reason: eligibility.reason };
  const risk = assessV24SnapshotRisk({
    security: grant.order.security, expectedSecurity: grant.order.security, market: grant.market, supportedMarkets: ["CN_A"],
    acceptedAt: grant.order.acceptedAt, evaluatedAt: clock.now().toISOString(),
    quote: { security: eligibility.security, observedAt: eligibility.observedAt, price: eligibility.price },
    referencePrice: grant.signal.referencePrice, freshnessLimitSeconds: grant.policy.freshnessLimitSeconds,
    maxDeviationBps: grant.policy.maxDeviationBps
  });
  if (risk.status === "BLOCKED") return { status: "BLOCKED", reason: risk.reason };
  if (risk.status === "REJECTED") return { status: "REJECTED", reason: risk.reason };
  const price = toTicks(eligibility.price);
  const fee = toTicks(grant.fee);
  const maxNotional = toTicks(grant.mandate.maxOrderNotional);
  const maxExposure = toTicks(grant.mandate.maxGrossExposure);
  const maxTurnover = toTicks(grant.mandate.maxDailyTurnover);
  if (price === null || fee === null || maxNotional === null || maxExposure === null || maxTurnover === null) return { status: "REJECTED", reason: "INVALID_POLICY_MONEY" };
  const notional = price * BigInt(grant.order.requestedQuantity);
  if (notional > maxNotional || notional > maxExposure || notional > maxTurnover) return { status: "REJECTED", reason: "MANDATE_NOTIONAL_LIMIT_EXCEEDED" };
  return { status: "ELIGIBLE", snapshot: { ...grant.snapshot, price: eligibility.price }, risk: { quoteAgeSeconds: risk.quoteAgeSeconds, deviationBps: risk.deviationBps }, reservedCash: fromTicks(notional + fee), executionModel: "SNAPSHOT", policyVersion: eligibility.policyVersion };
}

export function fixtureClock(isoTime: string): Clock {
  const millis = Date.parse(isoTime);
  if (!Number.isFinite(millis)) throw new Error("invalid run-scoped fixture Clock");
  return { now: () => new Date(millis) };
}
