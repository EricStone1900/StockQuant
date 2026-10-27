/** Candidate A's narrow execution admission rule. It does not authorize or submit an order. */
export const V24_CANDIDATE_EXECUTION_POLICY = {
  version: "c5-candidate-a-execution-v1",
  market: "CN_A",
  security: "600000.SH",
  windowStart: "09:31:00",
  windowEndExclusive: "09:35:00",
  maxSnapshotAgeSeconds: 60,
  maxDeviationBps: 100,
} as const;

export type V24CandidateExecutionAdmission =
  | { status: "ELIGIBLE"; quoteAgeSeconds: number; deviationBps: number; policyVersion: string }
  | { status: "PAUSED"; reason: "EXECUTION_WINDOW_CLOSED" | "SNAPSHOT_NOT_AFTER_ACCEPTANCE" | "SNAPSHOT_STALE" | "SNAPSHOT_STATUS_UNKNOWN" | "SNAPSHOT_INVALID" | "PRICE_DEVIATION_EXCEEDED" };

const timestamp = (value: string) => /(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ? Date.parse(value) : NaN;
const money = (value: string): bigint | null => {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/u.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, "0"));
};
const shanghaiTime = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(value));

/**
 * Evaluates one supplied snapshot under Candidate A's exact 09:31–09:35 and
 * 60-second policy. A caller must still separately prove Mandate, risk,
 * reservation and ledger eligibility.
 */
export function admitV24CandidateExecution(input: {
  acceptedAt: string; evaluatedAt: string; referencePrice: string;
  snapshot: { security: string; market: string; status: string; observedAt: string; ingestedAt: string; price: string };
}): V24CandidateExecutionAdmission {
  const acceptedAt = timestamp(input.acceptedAt); const evaluatedAt = timestamp(input.evaluatedAt);
  const observedAt = timestamp(input.snapshot.observedAt); const ingestedAt = timestamp(input.snapshot.ingestedAt);
  if (![acceptedAt, evaluatedAt].every(Number.isFinite) || evaluatedAt < acceptedAt) return { status: "PAUSED", reason: "SNAPSHOT_INVALID" };
  const acceptedLocal = shanghaiTime(input.acceptedAt);
  if (acceptedLocal < V24_CANDIDATE_EXECUTION_POLICY.windowStart || acceptedLocal >= V24_CANDIDATE_EXECUTION_POLICY.windowEndExclusive) return { status: "PAUSED", reason: "EXECUTION_WINDOW_CLOSED" };
  if (input.snapshot.status === "UNKNOWN") return { status: "PAUSED", reason: "SNAPSHOT_STATUS_UNKNOWN" };
  if (![observedAt, ingestedAt].every(Number.isFinite) || ingestedAt < observedAt || ingestedAt > evaluatedAt || input.snapshot.security !== V24_CANDIDATE_EXECUTION_POLICY.security || input.snapshot.market !== V24_CANDIDATE_EXECUTION_POLICY.market || input.snapshot.status !== "READY") return { status: "PAUSED", reason: "SNAPSHOT_INVALID" };
  if (observedAt <= acceptedAt) return { status: "PAUSED", reason: "SNAPSHOT_NOT_AFTER_ACCEPTANCE" };
  const quoteAgeSeconds = Math.floor((evaluatedAt - observedAt) / 1000);
  if (quoteAgeSeconds > V24_CANDIDATE_EXECUTION_POLICY.maxSnapshotAgeSeconds) return { status: "PAUSED", reason: "SNAPSHOT_STALE" };
  const price = money(input.snapshot.price); const reference = money(input.referencePrice);
  if (price === null || reference === null || price <= 0n || reference <= 0n) return { status: "PAUSED", reason: "SNAPSHOT_INVALID" };
  const difference = price > reference ? price - reference : reference - price;
  const deviationBps = Number((difference * 10_000n * 1_000_000n + reference / 2n) / reference) / 1_000_000;
  if (difference * 10_000n > reference * BigInt(V24_CANDIDATE_EXECUTION_POLICY.maxDeviationBps)) return { status: "PAUSED", reason: "PRICE_DEVIATION_EXCEEDED" };
  return { status: "ELIGIBLE", quoteAgeSeconds, deviationBps, policyVersion: V24_CANDIDATE_EXECUTION_POLICY.version };
}
