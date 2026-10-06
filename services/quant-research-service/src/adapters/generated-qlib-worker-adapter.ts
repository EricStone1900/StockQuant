import { GeneratedQlibWorkerClient, QlibWorkerHttpError } from "../contracts/generated-qlib-worker-client.js";
import type { QlibFitFixtureRequest, QlibFitFixtureResult } from "../contracts/generated-types.js";
import { QlibWorkerPortError, type QlibWorkerPort } from "../ports/qlib-worker.js";

export class GeneratedQlibWorkerAdapter implements QlibWorkerPort {
  constructor(private readonly client: GeneratedQlibWorkerClient) {}

  probe(): Promise<{ status: string; version?: string; detail?: string }> { return this.call(() => this.client.probe()); }
  fitFixture(body: QlibFitFixtureRequest): Promise<QlibFitFixtureResult> { return this.call(() => this.client.fitFixture(body, 120_000)); }
  trainSummary(body: { bars: Array<{ timestamp?: string; open: string; volume?: number }> }): Promise<Record<string, unknown>> { return this.call(() => this.client.trainSummary(body)); }
  validateSummary(body: { bars: Array<{ timestamp?: string; open: string; volume?: number }>; artifactHash: string }): Promise<Record<string, unknown>> { return this.call(() => this.client.validateSummary(body)); }

  private async call<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) {
      if (error instanceof QlibWorkerHttpError) throw new QlibWorkerPortError(error.status, error.body);
      throw error;
    }
  }
}
