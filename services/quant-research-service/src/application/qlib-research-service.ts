import type { QlibFitFixtureRequest } from "../contracts/generated-types.js";
import type { QlibWorkerPort, QlibWorkerProbe } from "../ports/qlib-worker.js";
import { QlibWorkerPortError } from "../ports/qlib-worker.js";

export type QlibServiceResult = { status: number; body: unknown };

export class QlibResearchService {
  constructor(private readonly worker?: QlibWorkerPort) {}

  async probe(): Promise<QlibWorkerProbe> {
    if (!this.worker) return { status: "NOT_RUN", detail: "quant-research-service Qlib worker identity is not configured" };
    try { return await this.worker.probe(); }
    catch (error) { return { status: "NOT_RUN", detail: this.detail(error) }; }
  }

  fitFixture(input: QlibFitFixtureRequest): Promise<QlibServiceResult> {
    return this.execute((worker) => worker.fitFixture(input), true);
  }

  trainSummary(input: { bars: Array<{ timestamp?: string; open: string; volume?: number }> }): Promise<QlibServiceResult> {
    return this.execute((worker) => worker.trainSummary(input));
  }

  validateSummary(input: { bars: Array<{ timestamp?: string; open: string; volume?: number }>; artifactHash: string }): Promise<QlibServiceResult> {
    return this.execute((worker) => worker.validateSummary(input));
  }

  private async execute(operation: (worker: QlibWorkerPort) => Promise<unknown>, fitTimeoutMessage = false): Promise<QlibServiceResult> {
    if (!this.worker) return { status: 503, body: { status: "NOT_RUN", reason: "quant-research-service Qlib worker identity is not configured" } };
    try { return { status: 200, body: await operation(this.worker) }; }
    catch (error) {
      if (error instanceof QlibWorkerPortError) return { status: error.status, body: error.body };
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      return { status: timedOut ? 504 : 503, body: { status: "NOT_RUN", reason: timedOut && fitTimeoutMessage ? "Qlib fixture fit timed out after 120 seconds" : error instanceof Error ? error.message : "Qlib worker unavailable" } };
    }
  }

  private detail(error: unknown): string {
    if (error instanceof QlibWorkerPortError) return `qlib worker returned ${error.status}`;
    return error instanceof Error ? error.message : "qlib worker unavailable";
  }
}
