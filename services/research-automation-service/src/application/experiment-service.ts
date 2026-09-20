import { cancelExperiment, createExperiment, validateRequest, type Experiment } from "../domain/experiment.js";
import type { ExperimentRepository } from "../ports/experiment-repository.js";

export class ExperimentService {
  constructor(private readonly repository: ExperimentRepository) {}

  async create(input: unknown): Promise<{ experiment: Experiment; existing: boolean }> {
    const request = validateRequest(input);
    const existing = await this.repository.findByIdempotencyKey(request.idempotencyKey);
    if (existing) return { experiment: existing, existing: true };
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
