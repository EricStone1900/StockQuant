import { createResearchCheckpoint, ResearchCheckpointConflict } from "../domain/research-checkpoint.js";
import type { ResearchCheckpointRepository } from "../ports/research-checkpoint-repository.js";
import type { ExperimentRepository } from "../ports/experiment-repository.js";

export interface ResearchCheckpointClock { now(): Date }

export class ResearchCheckpointService {
  constructor(
    private readonly experiments: ExperimentRepository,
    private readonly checkpoints: ResearchCheckpointRepository,
    private readonly clock: ResearchCheckpointClock,
  ) {}

  async append(experimentId: string, input: unknown) {
    const checkpoint = createResearchCheckpoint(experimentId, input, this.clock.now());
    const experiment = await this.experiments.findById(experimentId);
    if (!experiment) throw new ResearchCheckpointConflict("experiment not found");
    if (experiment.testRunId !== checkpoint.testRunId) throw new ResearchCheckpointConflict("checkpoint TestRun does not match its experiment");
    if (checkpoint.roundIndex > experiment.rounds) throw new ResearchCheckpointConflict("checkpoint round is outside the experiment allocation");
    return this.checkpoints.append(checkpoint);
  }

  latest(testRunId: string, experimentId: string, roundIndex: number) {
    return this.checkpoints.latest(testRunId, experimentId, roundIndex);
  }

  async list(testRunId: string, experimentId: string, roundIndex: number) {
    const experiment = await this.experiments.findById(experimentId);
    if (!experiment) throw new ResearchCheckpointConflict("experiment not found");
    if (experiment.testRunId !== testRunId) throw new ResearchCheckpointConflict("checkpoint TestRun does not match its experiment");
    if (roundIndex < 1 || roundIndex > experiment.rounds) throw new ResearchCheckpointConflict("checkpoint round is outside the experiment allocation");
    return this.checkpoints.list(testRunId, experimentId, roundIndex);
  }
}
