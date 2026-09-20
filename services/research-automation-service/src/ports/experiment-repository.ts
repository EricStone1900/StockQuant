import type { Experiment } from "../domain/experiment.js";

export interface ExperimentRepository {
  save(experiment: Experiment): Promise<Experiment>;
  findById(experimentId: string): Promise<Experiment | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<Experiment | null>;
}
