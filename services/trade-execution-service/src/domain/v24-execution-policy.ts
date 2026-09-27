export type V24ExecutionPolicy = {
  schemaVersion: "v24-paper-execution-policy-v1";
  policyId: "v24-snapshot-paper-policy";
  policyVersion: "1.0.0";
  status: "PREPARATION_ONLY";
  environmentMode: "PAPER";
  brokerMode: "FAKE";
  liveTradingEnabled: false;
  supportedMarkets: Array<"CN_A">;
  signal: { frequency: "DAILY_BAR"; asOfRequired: true; strategyVersion: "UNSET" };
  execution: {
    model: "SNAPSHOT";
    windowTimeZone: "Asia/Shanghai";
    windowStart: "09:31";
    windowEndExclusive: "09:35";
    requiresMandate: true;
    mandateVersion: "UNSET";
  };
  quoteRules: {
    priceBasis: "FIRST_QUALIFYING_SNAPSHOT";
    mustBeObservedAfterAcceptance: true;
    freshnessLimitSeconds: 1800;
    maxDeviationBps: number | null;
  };
  approval: { riskPolicyVersion: "UNSET"; feePolicyVersion: "UNSET" };
  risk: { requiresPassingEvaluation: true; requiresResourceReservation: true };
  configurationGaps: string[];
};

export type V24ExecutionPolicyReadiness =
  | { status: "BLOCKED"; reason: "POLICY_PREPARATION_ONLY"; configurationGaps: string[] }
  | { status: "REJECTED"; reason: "LIVE_OR_NON_FAKE_MODE" | "UNSUPPORTED_MARKET" };

/**
 * This is a readiness guard, not an execution path. The current version is
 * intentionally preparation-only until the owner supplies the exact strategy,
 * mandate, quote-deviation, risk, fee and market-policy values.
 */
export function assessV24ExecutionPolicyReadiness(input: {
  policy: V24ExecutionPolicy;
  market: "CN_A" | "US_EQUITY";
  environmentMode: string;
  brokerMode: string;
  liveTradingEnabled: boolean;
}): V24ExecutionPolicyReadiness {
  if (input.environmentMode !== "PAPER" || input.brokerMode !== "FAKE" || input.liveTradingEnabled) {
    return { status: "REJECTED", reason: "LIVE_OR_NON_FAKE_MODE" };
  }
  if (!input.policy.supportedMarkets.includes(input.market as "CN_A")) {
    return { status: "REJECTED", reason: "UNSUPPORTED_MARKET" };
  }
  return {
    status: "BLOCKED",
    reason: "POLICY_PREPARATION_ONLY",
    configurationGaps: [...new Set(input.policy.configurationGaps)]
  };
}
