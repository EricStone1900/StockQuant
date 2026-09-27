export type V24PaperMandatePreparation = {
  schemaVersion: "v24-paper-mandate-v1";
  mandateId: "UNSET";
  mandateVersion: "UNSET";
  status: "PREPARATION_ONLY";
  ownerId: "UNSET";
  accountId: "UNSET";
  namespace: "UNSET";
  testRunId: "UNSET";
  market: "CN_A";
  strategyVersion: "UNSET";
  securityScope: [];
  limits: { maxOrderNotional: null; maxGrossExposure: null; maxDailyTurnover: null };
  validity: { validFrom: null; validUntil: null };
  approvalEvidenceRef: "UNSET";
  configurationGaps: string[];
};

export type V24MandateReadiness =
  | { status: "BLOCKED"; reason: "MANDATE_PREPARATION_ONLY"; configurationGaps: string[] }
  | { status: "REJECTED"; reason: "UNSUPPORTED_MARKET" };

/** Preparation gate only; it deliberately has no path that authorizes orders. */
export function assessV24MandateReadiness(input: {
  mandate: V24PaperMandatePreparation;
  market: "CN_A" | "US_EQUITY";
}): V24MandateReadiness {
  if (input.market !== input.mandate.market) return { status: "REJECTED", reason: "UNSUPPORTED_MARKET" };
  return {
    status: "BLOCKED",
    reason: "MANDATE_PREPARATION_ONLY",
    configurationGaps: [...new Set(input.mandate.configurationGaps)]
  };
}
