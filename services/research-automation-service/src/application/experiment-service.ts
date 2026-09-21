import { cancelExperiment, createExperiment, validateRequest, type Experiment } from "../domain/experiment.js";
import type { ExperimentRepository } from "../ports/experiment-repository.js";

export class ExperimentIdempotencyConflict extends Error {
  constructor(message = "idempotency key was reused with different experiment inputs") {
    super(message);
    this.name = "ExperimentIdempotencyConflict";
  }
}

export class ExperimentService {
  constructor(private readonly repository: ExperimentRepository, private readonly maxBudgetCents = 1000) {}

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
      return { experiment: existing, existing: true };
    }
    const experiment = await this.repository.save(createExperiment(request));
    return { experiment, existing: false };
  }

  async get(experimentId: string): Promise<Experiment | null> { return this.repository.findById(experimentId); }

  async cancel(experimentId: string): Promise<Experiment | null> {
    const experiment = await this.repository.findById(experimentId);
    if (!experiment) return null;
    return this.repository.save(cancelExperiment(experiment));
  }
}
