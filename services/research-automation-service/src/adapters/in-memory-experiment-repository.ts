import type { Experiment } from "../domain/experiment.js";
import type { ExperimentRepository } from "../ports/experiment-repository.js";

export class InMemoryExperimentRepository implements ExperimentRepository {
  private readonly rows = new Map<string, Experiment>();
  async save(experiment: Experiment): Promise<Experiment> {
    this.rows.set(experiment.experimentId, experiment);
    return experiment;
  }
  async findById(experimentId: string): Promise<Experiment | null> { return this.rows.get(experimentId) ?? null; }
  async findByIdempotencyKey(idempotencyKey: string): Promise<Experiment | null> {
    return [...this.rows.values()].find((row) => row.idempotencyKey === idempotencyKey) ?? null;
  }
}
