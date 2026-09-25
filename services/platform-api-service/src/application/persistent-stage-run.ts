import type { PostgresStageRunRepository } from "../adapters/postgres-stage-run-repository.js";

type EngineRun = {
  testRunId: string;
  stageId: string;
  scenarioId: string;
  seed: number;
  status: string;
  assertions: unknown[];
  evidence: Record<string, unknown>;
};

export class PersistentStageRunService {
  constructor(
    private readonly repository: PostgresStageRunRepository,
    private readonly stageId: string,
    private readonly runEngine: (scenarioId: string, seed: number) => EngineRun
  ) {}

  async create(ownerId: string, scenarioId: string, seed: number) {
    const result = this.runEngine(scenarioId, seed);
    await this.repository.save({
      testRunId: result.testRunId,
      stageId: this.stageId,
      scenarioId: result.scenarioId,
      scenarioVersion: "1.0.0",
      ownerId,
      namespace: `${this.stageId.toLowerCase().replace(".", "-")}-${scenarioId}-${result.testRunId}`,
      status: result.status,
      seed: result.seed,
      assertions: result.assertions,
      evidence: result.evidence
    });
    return { accepted: true, testRunId: result.testRunId, status: result.status };
  }

  find(testRunId: string, ownerId: string) {
    return this.repository.find(testRunId, ownerId);
  }
}
