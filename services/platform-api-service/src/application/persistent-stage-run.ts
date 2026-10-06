import type { StageRunRepository } from "../ports/stage-run-repository.js";

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
    private readonly repository: StageRunRepository,
    private readonly stageId: string,
    private readonly runEngine: (scenarioId: string, seed: number, configuration?: unknown) => EngineRun | Promise<EngineRun>,
    private readonly scenarioVersion: (scenarioId: string) => string = () => "1.0.0"
  ) {}

  async create(ownerId: string, scenarioId: string, seed: number, configuration?: unknown) {
    const result = await this.runEngine(scenarioId, seed, configuration);
    await this.repository.save({
      testRunId: result.testRunId,
      stageId: this.stageId,
      scenarioId: result.scenarioId,
      scenarioVersion: this.scenarioVersion(scenarioId),
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
