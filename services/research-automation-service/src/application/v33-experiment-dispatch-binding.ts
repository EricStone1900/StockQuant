import type { Experiment } from "../domain/experiment.js";

export type DispatchBindingResult =
  | { status: "BOUND" }
  | { status: "EXPERIMENT_NOT_FOUND" }
  | { status: "TEST_RUN_MISMATCH" }
  | { status: "ROUND_REQUIRED" }
  | { status: "ROUND_MISMATCH" }
  | { status: "BUDGET_NOT_RESERVED" };

/** Fail closed before queue insertion unless the experiment and reserved budget belong to this exact TestRun. */
export function validateExperimentDispatchBinding(
  testRunId: string,
  experiment: Experiment | null,
  budgetStatus: string | null,
  roundIndex?: number,
): DispatchBindingResult {
  if (!experiment) return { status: "EXPERIMENT_NOT_FOUND" };
  if (!experiment.testRunId || experiment.testRunId !== testRunId) return { status: "TEST_RUN_MISMATCH" };
  if (experiment.rounds > 1 && roundIndex === undefined) return { status: "ROUND_REQUIRED" };
  if (roundIndex !== undefined && !Number.isSafeInteger(roundIndex)) return { status: "ROUND_MISMATCH" };
  if ((roundIndex ?? 1) < 1 || (roundIndex ?? 1) > experiment.rounds) return { status: "ROUND_MISMATCH" };
  if (budgetStatus !== "RESERVED") return { status: "BUDGET_NOT_RESERVED" };
  return { status: "BOUND" };
}
