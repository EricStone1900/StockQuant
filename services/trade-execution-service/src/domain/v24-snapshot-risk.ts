export type SnapshotRiskInput = {
  security: string;
  expectedSecurity: string;
  market: "CN_A" | "US_EQUITY";
  supportedMarkets: ReadonlyArray<"CN_A" | "US_EQUITY">;
  acceptedAt: string;
  evaluatedAt: string;
  quote: { security: string; observedAt: string; price: string };
  referencePrice: string;
  freshnessLimitSeconds: number;
  maxDeviationBps: number | null;
};

export type SnapshotRiskResult =
  | { status: "REJECTED"; reason: "UNSUPPORTED_MARKET" | "SECURITY_MISMATCH" | "INVALID_TIMESTAMP" | "QUOTE_NOT_AFTER_ACCEPTANCE" | "QUOTE_FROM_FUTURE" | "STALE_QUOTE" | "INVALID_PRICE" | "PRICE_DEVIATION_EXCEEDED"; quoteAgeSeconds?: number; deviationBps?: number }
  | { status: "BLOCKED"; reason: "RISK_POLICY_UNSET"; configurationGaps: string[] }
  | { status: "PASS_RISK_CHECK"; quoteAgeSeconds: number; deviationBps: number };

/** Deterministic quote eligibility check. Passing this function does not authorize or place an order. */
export function assessV24SnapshotRisk(input: SnapshotRiskInput): SnapshotRiskResult {
  if (!input.supportedMarkets.includes(input.market)) return { status: "REJECTED", reason: "UNSUPPORTED_MARKET" };
  if (input.security !== input.expectedSecurity || input.quote.security !== input.expectedSecurity) {
    return { status: "REJECTED", reason: "SECURITY_MISMATCH" };
  }
  const timestamps = [input.acceptedAt, input.evaluatedAt, input.quote.observedAt];
  if (timestamps.some((value) => !/(?:Z|[+-]\d{2}:\d{2})$/u.test(value))) return { status: "REJECTED", reason: "INVALID_TIMESTAMP" };
  const [acceptedAt, evaluatedAt, observedAt] = timestamps.map(Date.parse);
  if (![acceptedAt, evaluatedAt, observedAt].every(Number.isFinite) || evaluatedAt < acceptedAt) {
    return { status: "REJECTED", reason: "INVALID_TIMESTAMP" };
  }
  if (observedAt <= acceptedAt) return { status: "REJECTED", reason: "QUOTE_NOT_AFTER_ACCEPTANCE" };
  if (observedAt > evaluatedAt) return { status: "REJECTED", reason: "QUOTE_FROM_FUTURE" };
  const quoteAgeSeconds = Math.floor((evaluatedAt - observedAt) / 1000);
  if (!Number.isInteger(input.freshnessLimitSeconds) || input.freshnessLimitSeconds < 0 || quoteAgeSeconds > input.freshnessLimitSeconds) {
    return { status: "REJECTED", reason: "STALE_QUOTE", quoteAgeSeconds };
  }
  const quotePrice = priceTicks(input.quote.price);
  const referencePrice = priceTicks(input.referencePrice);
  if (quotePrice === null || referencePrice === null || quotePrice <= 0n || referencePrice <= 0n) {
    return { status: "REJECTED", reason: "INVALID_PRICE" };
  }
  const maxDeviationMicroBps = input.maxDeviationBps === null ? null : scaledPolicyValue(String(input.maxDeviationBps));
  if (maxDeviationMicroBps === null || maxDeviationMicroBps < 0n) {
    return { status: "BLOCKED", reason: "RISK_POLICY_UNSET", configurationGaps: ["maxDeviationBps"] };
  }
  const difference = quotePrice >= referencePrice ? quotePrice - referencePrice : referencePrice - quotePrice;
  const scaledDeviationNumerator = difference * 10_000n * 1_000_000n;
  const deviationMicroBps = (scaledDeviationNumerator + referencePrice / 2n) / referencePrice;
  const deviationBps = Number(deviationMicroBps) / 1_000_000;
  if (!Number.isFinite(deviationBps)) return { status: "REJECTED", reason: "INVALID_PRICE" };
  if (scaledDeviationNumerator > referencePrice * maxDeviationMicroBps) return { status: "REJECTED", reason: "PRICE_DEVIATION_EXCEEDED", deviationBps };
  return { status: "PASS_RISK_CHECK", quoteAgeSeconds, deviationBps };
}

/** Parse fixed-point prices (four decimal places) without converting money to binary floating point. */
function priceTicks(value: string): bigint | null {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(`${whole}${fraction.padEnd(4, "0")}`);
}

/** Deviation policy is a JSON number today; normalize its decimal spelling to micro-basis-points. */
function scaledPolicyValue(value: string): bigint | null {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/u.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(`${whole}${fraction.padEnd(6, "0")}`);
}
