import type { StoredStageRun, V33WorkflowStatus } from "../ports/stage-run-repository.js";

export const V33_READINESS_CANCEL_COMMAND = "CANCEL_V33_READINESS_RUN" as const;

export type V33ReadinessCancellation = {
  status: V33WorkflowStatus;
  assertions: unknown[];
  evidence: Record<string, unknown>;
  idempotent: boolean;
} | {
  error: "INVALID_CONFIRMATION" | "NOT_V33_RUN" | "NOT_CANCELLABLE" | "EXECUTION_ALREADY_STARTED";
};

/** Cancel only a persisted readiness placeholder. This never cancels a Runner Job. */
export function cancelV33ReadinessRun(
  run: Pick<StoredStageRun, "stageId" | "status" | "assertions" | "evidence">,
  confirmation: unknown,
  cancelledAt: string,
): V33ReadinessCancellation {
  if (confirmation !== V33_READINESS_CANCEL_COMMAND) return { error: "INVALID_CONFIRMATION" };
  if (run.stageId !== "V3.3") return { error: "NOT_V33_RUN" };
  const cancellation = run.evidence.cancellation;
  if (run.status === "CANCELLED" && cancellation && typeof cancellation === "object"
    && (cancellation as Record<string, unknown>).scope === "READINESS_ONLY") {
    return { status: "CANCELLED", assertions: run.assertions, evidence: run.evidence, idempotent: true };
  }
  if (run.status !== "WAITING") return { error: "NOT_CANCELLABLE" };
  if (run.evidence.readiness !== "WAITING"
    || run.evidence.workflowStep !== "TEST_RUN_BUDGET_BOUND"
    || run.evidence.runnerDispatch !== "NOT_PERFORMED"
    || run.evidence.runnerJobsCreated !== 0) return { error: "EXECUTION_ALREADY_STARTED" };
  return {
    status: "CANCELLED",
    assertions: run.assertions,
    evidence: {
      ...run.evidence,
      readiness: "CANCELLED",
      cancellation: { scope: "READINESS_ONLY", cancelledAt, runnerJobsCancelled: 0 },
    },
    idempotent: false,
  };
}
