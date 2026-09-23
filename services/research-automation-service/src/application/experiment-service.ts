import { cancelExperiment, createExperiment, validateRequest, type Experiment } from "../domain/experiment.js";
import type { ExperimentRepository } from "../ports/experiment-repository.js";

export type ExperimentBudgetLedger = {
  reserve(experimentId: string, requestedCents: number): Promise<unknown> | unknown;
  get?(experimentId: string): Promise<unknown> | unknown;
  reject?(experimentId: string): Promise<unknown> | unknown;
};

export class ExperimentIdempotencyConflict extends Error {
  constructor(message = "idempotency key was reused with different experiment inputs") {
    super(message);
    this.name = "ExperimentIdempotencyConflict";
  }
}

export class ExperimentService {
  constructor(private readonly repository: ExperimentRepository, private readonly maxBudgetCents = 1000, private readonly budgetLedger: ExperimentBudgetLedger | null = null) {}

  async create(input: unknown): Promise<{ experiment: Experiment; existing: boolean }> {
    const request = validateRequest(input, this.maxBudgetCents);
    const existing = await this.repository.findByIdempotencyKey(request.idempotencyKey);
    if (existing) {
      const same = existing.fixtureId === request.fixtureId
        && existing.modelProfile === request.modelProfile
        && existing.rounds === request.rounds
        && existing.budgetCurrency === request.budgetCurrency
        && existing.budgetCents === request.budgetCents
        && existing.environmentMode === request.environmentMode
        && existing.brokerMode === request.brokerMode;
      if (!same) throw new ExperimentIdempotencyConflict();
      if (this.budgetLedger?.get && !(await this.budgetLedger.get(existing.experimentId))) await this.budgetLedger.reserve(existing.experimentId, existing.budgetCents);
      return { experiment: existing, existing: true };
    }
    const experiment = createExperiment(request);
    if (this.budgetLedger) await this.budgetLedger.reserve(experiment.experimentId, experiment.budgetCents);
    try {
      return { experiment: await this.repository.save(experiment), existing: false };
    } catch (error) {
      if (this.budgetLedger?.reject) await this.budgetLedger.reject(experiment.experimentId);
      throw error;
    }
  }

  async get(experimentId: string): Promise<Experiment | null> { return this.repository.findById(experimentId); }

  async cancel(experimentId: string): Promise<Experiment | null> {
    const experiment = await this.repository.findById(experimentId);
    if (!experiment) return null;
    return this.repository.save(cancelExperiment(experiment));
  }
}
