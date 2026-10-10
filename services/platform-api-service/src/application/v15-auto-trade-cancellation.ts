import type { Clock } from "./v24-scheduler.js";
import type { StageRunRepository, StoredStageRun } from "../ports/stage-run-repository.js";

/** Records the cancellation event using the injected runtime clock. */
export class V15AutoTradeCancellationService {
  constructor(
    private readonly runs: Pick<StageRunRepository, "requestV15AutoTradeCancellation">,
    private readonly clock: Clock
  ) {}

  request(testRunId: string, ownerId: string): Promise<StoredStageRun> {
    return this.runs.requestV15AutoTradeCancellation(
      testRunId,
      ownerId,
      this.clock.now().toISOString()
    );
  }
}
