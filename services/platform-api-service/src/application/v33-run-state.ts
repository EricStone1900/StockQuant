import type { V33WorkflowStatus } from "../ports/stage-run-repository.js";

const terminal = new Set<V33WorkflowStatus>(["COMPLETED", "FAILED", "CANCELLED"]);
const transitions: Readonly<Record<V33WorkflowStatus, ReadonlySet<V33WorkflowStatus>>> = {
  QUEUED: new Set(["RUNNING", "FAILED", "CANCELLED"]),
  // RUNNING -> RUNNING is used to durably checkpoint multi-step dispatch and
  // reconciliation progress between idempotent cross-service calls.
  RUNNING: new Set(["RUNNING", "QUEUED", "WAITING", "COMPLETED", "FAILED", "CANCELLED"]),
  WAITING: new Set(["RUNNING", "FAILED", "CANCELLED"]),
  COMPLETED: new Set(),
  FAILED: new Set(),
  CANCELLED: new Set(),
};

export function isV33WorkflowTransitionAllowed(from: V33WorkflowStatus, to: V33WorkflowStatus): boolean {
  return !terminal.has(from) && transitions[from].has(to);
}

export function isV33WorkflowTerminal(status: V33WorkflowStatus): boolean {
  return terminal.has(status);
}

/**
 * A persisted terminal status is an acceptance fact, not a synonym for a
 * finished HTTP request. Keep COMPLETED behind the evidence needed by V3.3.
 */
export function assertV33CompletionEvidence(assertions: unknown[], evidence: Record<string, unknown>): void {
  const requiredAssertions = ["V3.1_ACCEPTANCE", "V3.2_EXACT_VERSION", "PAPER_CONTINUITY", "V3.3_EXECUTOR"];
  const passed = new Set(assertions.flatMap((assertion) => {
    if (!assertion || typeof assertion !== "object" || Array.isArray(assertion)) return [];
    const item = assertion as Record<string, unknown>;
    return typeof item.id === "string" && item.status === "PASS" ? [item.id] : [];
  }));
  if (requiredAssertions.some((id) => !passed.has(id))) {
    throw new Error("V3.3 completion requires PASS evidence for exact V3.1/V3.2, Paper continuity, and executor assertions");
  }
  const experiments = evidence.experimentIds;
  const jobs = evidence.runnerJobIds;
  const expectedRounds = evidence.expectedRounds;
  const completedRounds = evidence.completedRounds;
  if (evidence.businessWorkflow !== "COMPLETED"
    || evidence.paperContinuity !== "VERIFIED"
    || evidence.stageBudgetControl !== "TEST_RUN_AND_ROUND_CAP_ENFORCED"
    || !Array.isArray(experiments) || experiments.length === 0
    || experiments.some((id) => typeof id !== "string" || id.length === 0)
    || !Array.isArray(jobs) || jobs.length === 0
    || jobs.some((id) => typeof id !== "string" || id.length === 0)
    || !Number.isSafeInteger(expectedRounds) || Number(expectedRounds) < 1 || Number(expectedRounds) > 3
    || completedRounds !== expectedRounds) {
    throw new Error("V3.3 completion requires completed Experiment rounds, persisted Runner jobs, enforced budgets, and verified Paper continuity");
  }
}
