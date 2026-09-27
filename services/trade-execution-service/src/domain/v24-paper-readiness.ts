import { assessV24ExecutionPolicyReadiness, type V24ExecutionPolicy } from "./v24-execution-policy.js";
import { assessV24MandateReadiness, type V24PaperMandatePreparation } from "./v24-mandate-readiness.js";

export type V24PaperReadiness = {
  schemaVersion: "v24-paper-execution-readiness-v1";
  market: "CN_A" | "US_EQUITY";
  environmentMode: "PAPER";
  brokerMode: "FAKE";
  liveTradingEnabled: false;
  status: "BLOCKED" | "REJECTED";
  policyReadiness: ReturnType<typeof assessV24ExecutionPolicyReadiness>;
  mandateReadiness: ReturnType<typeof assessV24MandateReadiness>;
  riskEvaluation: { status: "NOT_RUN"; reason: "NO_REQUEST_SCOPED_ORDER_AND_SNAPSHOT" };
  resourceReservation: { status: "NOT_RUN"; reason: "MANDATE_OR_ACCOUNT_UNSET" };
  orderSubmissionEnabled: false;
};

/** Combines the existing fail-closed policy and Mandate guards for read-only readiness. */
export function assessV24PaperReadiness(input: {
  policy: V24ExecutionPolicy;
  mandate: V24PaperMandatePreparation;
  market: "CN_A" | "US_EQUITY";
}): V24PaperReadiness {
  const policyReadiness = assessV24ExecutionPolicyReadiness({
    policy: input.policy,
    market: input.market,
    environmentMode: "PAPER",
    brokerMode: "FAKE",
    liveTradingEnabled: false,
  });
  const mandateReadiness = assessV24MandateReadiness({ mandate: input.mandate, market: input.market });
  const rejected = policyReadiness.status === "REJECTED" || mandateReadiness.status === "REJECTED";
  return {
    schemaVersion: "v24-paper-execution-readiness-v1",
    market: input.market,
    environmentMode: "PAPER",
    brokerMode: "FAKE",
    liveTradingEnabled: false,
    status: rejected ? "REJECTED" : "BLOCKED",
    policyReadiness,
    mandateReadiness,
    riskEvaluation: { status: "NOT_RUN", reason: "NO_REQUEST_SCOPED_ORDER_AND_SNAPSHOT" },
    resourceReservation: { status: "NOT_RUN", reason: "MANDATE_OR_ACCOUNT_UNSET" },
    orderSubmissionEnabled: false,
  };
}
