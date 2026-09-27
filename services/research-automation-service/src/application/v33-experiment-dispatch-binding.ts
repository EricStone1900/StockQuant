import type { Experiment } from "../domain/experiment.js";

export type DispatchBindingResult =
  | { status: "BOUND" }
  | { status: "EXPERIMENT_NOT_FOUND" }
  | { status: "TEST_RUN_MISMATCH" }
  | { status: "BUDGET_NOT_RESERVED" };

/** Fail closed before queue insertion unless the experiment and reserved budget belong to this exact TestRun. */
export function validateExperimentDispatchBinding(
  testRunId: string,
  experiment: Experiment | null,
  budgetStatus: string | null,
): DispatchBindingResult {
  if (!experiment) return { status: "EXPERIMENT_NOT_FOUND" };
  if (!experiment.testRunId || experiment.testRunId !== testRunId) return { status: "TEST_RUN_MISMATCH" };
  if (budgetStatus !== "RESERVED") return { status: "BUDGET_NOT_RESERVED" };
  return { status: "BOUND" };
}
