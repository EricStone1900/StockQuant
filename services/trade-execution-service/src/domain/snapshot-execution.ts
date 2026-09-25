/**
 * Deterministic eligibility gate for the first observed snapshot after a Paper
 * order is accepted. This is deliberately not a complete execution policy and
 * does not create an order or fill; governance, risk, account reservations,
 * quote-deviation rules, and FakeBroker persistence must still pass separately.
 */
export const V24_SNAPSHOT_ELIGIBILITY_POLICY = {
  version: "v24-snapshot-eligibility-v1",
  maxSnapshotAgeSeconds: 1800,
  executionModel: "SNAPSHOT"
} as const;

export type Snapshot = {
  snapshotId: string;
  security: string;
  market: "CN_A" | "US_EQUITY";
  sourceMode: "LIVE_SOURCE" | "FIXTURE";
  status: "READY" | "STALE" | "UNKNOWN";
  observedAt: string;
  ingestedAt: string;
  price: string;
};

export type SnapshotExecutionOrder = {
  security: string;
  market: "CN_A" | "US_EQUITY";
  acceptedAt: string;
  executionWindowStart: string;
  executionWindowEnd: string;
};

export type SnapshotEligibility =
  | { status: "ELIGIBLE"; snapshotId: string; security: string; market: "CN_A" | "US_EQUITY"; sourceMode: "LIVE_SOURCE" | "FIXTURE"; observedAt: string; price: string; executionModel: "SNAPSHOT"; policyVersion: string }
  | { status: "WAITING"; reason: "NO_POST_ORDER_SNAPSHOT" | "NO_SNAPSHOT_IN_EXECUTION_WINDOW" | "SNAPSHOT_NOT_FRESH" }
  | { status: "REJECTED"; reason: "LIVE_OR_NON_FAKE_MODE" | "INVALID_ORDER_WINDOW" | "INVALID_SNAPSHOT" };

export const V24_SNAPSHOT_FIXTURE_EXECUTION_POLICY = {
  version: "v24-snapshot-fixture-execution-v1",
  executionModel: "SNAPSHOT",
  priceBasis: "FIRST_QUALIFYING_SNAPSHOT",
  fillAssumption: "FULL_REQUESTED_QUANTITY",
  liquidityParticipation: "NOT_VERIFIED",
  slippageModel: "NOT_APPLIED",
  feeModel: "FIXTURE_INPUT"
} as const;

export type SnapshotExecutionResult =
  | { status: "PROJECTED_ONLY"; proposedOrderId: string; proposedFillId: string; quantity: number; price: string; fee: string; currency: "CNY" | "USD"; effectiveAt: string; snapshotId: string; executionModel: "SNAPSHOT"; policyVersion: string; liquidityParticipation: "NOT_VERIFIED" }
  | { status: "WAITING"; reason: string }
  | { status: "REJECTED"; reason: string };

export interface Clock { now(): Date }

function validFixtureFee(value: string): boolean {
  return /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(value);
}

/** Fixture-only fill projection. It is not an enabled Paper execution policy. */
export function calculateSnapshotFixtureExecution(input: {
  mode: { environmentMode: string; brokerMode: string; liveTradingEnabled: boolean; dataMode: "FIXTURE" | "REAL" };
  eligibility: SnapshotEligibility;
  order: SnapshotExecutionOrder & { namespace: string; accountId: string; clientOrderId: string; requestedQuantity: number };
  fixtureFee: string;
  ids: { orderId: string; externalFillId: string };
}): SnapshotExecutionResult {
  if (input.mode.environmentMode !== "PAPER" || input.mode.brokerMode !== "FAKE" || input.mode.liveTradingEnabled) {
    return { status: "REJECTED", reason: "LIVE_OR_NON_FAKE_MODE" };
  }
  if (input.mode.dataMode !== "FIXTURE") return { status: "REJECTED", reason: "FIXTURE_ONLY" };
  if (input.eligibility.status !== "ELIGIBLE") {
    return input.eligibility.status === "WAITING"
      ? { status: "WAITING", reason: input.eligibility.reason }
      : { status: "REJECTED", reason: input.eligibility.reason };
  }
  if (!input.order.namespace || !input.order.accountId || !input.order.clientOrderId ||
      !Number.isSafeInteger(input.order.requestedQuantity) || input.order.requestedQuantity <= 0 ||
      !validFixtureFee(input.fixtureFee)) return { status: "REJECTED", reason: "INVALID_FIXTURE_EXECUTION_INPUT" };
  if (input.eligibility.sourceMode !== "FIXTURE" || input.eligibility.security !== input.order.security || input.eligibility.market !== input.order.market) {
    return { status: "REJECTED", reason: "FIXTURE_SNAPSHOT_SCOPE_MISMATCH" };
  }
  return {
    status: "PROJECTED_ONLY", proposedOrderId: input.ids.orderId, proposedFillId: input.ids.externalFillId,
    quantity: input.order.requestedQuantity, price: input.eligibility.price, fee: input.fixtureFee,
    currency: input.order.market === "CN_A" ? "CNY" : "USD", effectiveAt: input.eligibility.observedAt,
    snapshotId: input.eligibility.snapshotId, executionModel: "SNAPSHOT",
    policyVersion: V24_SNAPSHOT_FIXTURE_EXECUTION_POLICY.version,
    liquidityParticipation: "NOT_VERIFIED"
  };
}

function timestamp(value: string): number | null {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveMoney(value: string): boolean {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(value)) return false;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(`${whole}${fraction.padEnd(4, "0")}`) > 0n;
}

export function selectFirstQualifyingSnapshot(input: {
  mode: { environmentMode: string; brokerMode: string; liveTradingEnabled: boolean };
  order: SnapshotExecutionOrder;
  snapshots: Snapshot[];
  clock: Clock;
}): SnapshotEligibility {
  if (input.mode.environmentMode !== "PAPER" || input.mode.brokerMode !== "FAKE" || input.mode.liveTradingEnabled) {
    return { status: "REJECTED", reason: "LIVE_OR_NON_FAKE_MODE" };
  }

  const acceptedAt = timestamp(input.order.acceptedAt);
  const windowStart = timestamp(input.order.executionWindowStart);
  const windowEnd = timestamp(input.order.executionWindowEnd);
  const now = input.clock.now().getTime();
  if (acceptedAt === null || windowStart === null || windowEnd === null || !Number.isFinite(now) || windowStart >= windowEnd || acceptedAt < windowStart || acceptedAt >= windowEnd) {
    return { status: "REJECTED", reason: "INVALID_ORDER_WINDOW" };
  }

  const ordered = [...input.snapshots].sort((left, right) => (timestamp(left.observedAt) ?? Number.MAX_SAFE_INTEGER) - (timestamp(right.observedAt) ?? Number.MAX_SAFE_INTEGER));
  const afterOrder = ordered.filter((snapshot) => {
    const observedAt = timestamp(snapshot.observedAt);
    return observedAt !== null && observedAt > acceptedAt;
  });
  if (afterOrder.length === 0) return { status: "WAITING", reason: "NO_POST_ORDER_SNAPSHOT" };

  const inWindow = afterOrder.filter((snapshot) => {
    const observedAt = timestamp(snapshot.observedAt)!;
    return observedAt >= windowStart && observedAt < windowEnd;
  });
  if (inWindow.length === 0) return { status: "WAITING", reason: "NO_SNAPSHOT_IN_EXECUTION_WINDOW" };
  const matching = inWindow.filter((snapshot) => snapshot.market === input.order.market && snapshot.security === input.order.security);
  if (matching.length === 0) return { status: "WAITING", reason: "NO_SNAPSHOT_IN_EXECUTION_WINDOW" };

  for (const snapshot of matching) {
    const observedAt = timestamp(snapshot.observedAt)!;
    const ingestedAt = timestamp(snapshot.ingestedAt);
    if (!snapshot.snapshotId || !["LIVE_SOURCE", "FIXTURE"].includes(snapshot.sourceMode) ||
      !positiveMoney(snapshot.price) || ingestedAt === null || ingestedAt < observedAt || ingestedAt > now) {
      return { status: "REJECTED", reason: "INVALID_SNAPSHOT" };
    }
    if (snapshot.status !== "READY" || now < observedAt || now - observedAt > V24_SNAPSHOT_ELIGIBILITY_POLICY.maxSnapshotAgeSeconds * 1000) continue;
    return {
      status: "ELIGIBLE",
      snapshotId: snapshot.snapshotId,
      security: snapshot.security,
      market: snapshot.market,
      sourceMode: snapshot.sourceMode,
      observedAt: snapshot.observedAt,
      price: snapshot.price,
      executionModel: V24_SNAPSHOT_ELIGIBILITY_POLICY.executionModel,
      policyVersion: V24_SNAPSHOT_ELIGIBILITY_POLICY.version
    };
  }

  return { status: "WAITING", reason: "SNAPSHOT_NOT_FRESH" };
}
