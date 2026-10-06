import type { QlibFitFixtureRequest, QlibFitFixtureResult } from "../contracts/generated-types.js";

export interface QlibWorkerPort {
  probe(): Promise<{ status: string; version?: string; detail?: string }>;
  fitFixture(body: QlibFitFixtureRequest): Promise<QlibFitFixtureResult>;
  trainSummary(body: { bars: Array<{ timestamp?: string; open: string; volume?: number }> }): Promise<Record<string, unknown>>;
  validateSummary(body: { bars: Array<{ timestamp?: string; open: string; volume?: number }>; artifactHash: string }): Promise<Record<string, unknown>>;
}

export class QlibWorkerPortError extends Error {
  constructor(readonly status: number, readonly body: unknown) {
    super(`Qlib Worker returned HTTP ${status}`);
    this.name = "QlibWorkerPortError";
  }
}
