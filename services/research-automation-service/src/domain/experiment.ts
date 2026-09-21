export type ExperimentStatus = "PENDING_PREREQUISITES" | "CANCELLED";

export type ExperimentRequest = {
  fixtureId: string;
  modelProfile: string;
  rounds: number;
  budgetCurrency: "USD";
  budgetCents: number;
  environmentMode: "RESEARCH";
  brokerMode: "FAKE";
  idempotencyKey: string;
};

export const MAX_EXPERIMENT_BUDGET_CENTS = 1000;

export type Experiment = ExperimentRequest & {
  experimentId: string;
  status: ExperimentStatus;
  reason: string;
  createdAt: string;
  cancelledAt: string | null;
};

export function validateRequest(input: unknown, maxBudgetCents = MAX_EXPERIMENT_BUDGET_CENTS): ExperimentRequest {
  if (!input || typeof input !== "object") throw new Error("request body must be an object");
  const body = input as Record<string, unknown>;
  const requiredString = (name: string) => {
    const value = body[name];
    if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is required`);
    return value;
  };
  const fixtureId = requiredString("fixtureId");
  const modelProfile = requiredString("modelProfile");
  const idempotencyKey = requiredString("idempotencyKey");
  if (idempotencyKey.length < 8) throw new Error("idempotencyKey must be at least 8 characters");
  if (body.environmentMode !== "RESEARCH") throw new Error("environmentMode must be RESEARCH");
  if (body.brokerMode !== "FAKE") throw new Error("brokerMode must be FAKE");
  if (body.budgetCurrency !== "USD") throw new Error("budgetCurrency must be USD");
  if (!Number.isInteger(body.rounds) || Number(body.rounds) < 1 || Number(body.rounds) > 3) throw new Error("rounds must be an integer from 1 to 3");
  if (!Number.isInteger(body.budgetCents) || Number(body.budgetCents) < 1) throw new Error("budgetCents must be a positive integer");
  if (Number(body.budgetCents) > maxBudgetCents) throw new Error(`budgetCents must not exceed ${maxBudgetCents} USD cents`);
  return { fixtureId, modelProfile, rounds: Number(body.rounds), budgetCurrency: "USD", budgetCents: Number(body.budgetCents), environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey };
}

export function createExperiment(request: ExperimentRequest, now = new Date(), experimentId = crypto.randomUUID()): Experiment {
  return { ...request, experimentId, status: "PENDING_PREREQUISITES", reason: "real model credentials and the isolated Runner are not configured", createdAt: now.toISOString(), cancelledAt: null };
}

export function cancelExperiment(experiment: Experiment, now = new Date()): Experiment {
  if (experiment.status === "CANCELLED") return experiment;
  return { ...experiment, status: "CANCELLED", cancelledAt: now.toISOString() };
}
