import type { V31RunnerClaimCommand, V31RunnerCompleteCommand, V31RunnerExecution, V31RunnerInputRequest, V31RunnerInputResponse, V31RunnerJobRecord, V31ResearchArtifactRef, V33RunnerCheckpointCommand, V33RunnerCheckpointReadResult, V33RunnerCheckpointResult } from "../contracts/generated-types.js";
import { GeneratedRunnerHostClient, RunnerHostHttpError } from "../contracts/generated-runner-host-client.js";
import type { RunnerJobLease } from "./v31-runner-jobs.js";
import { sha256 } from "./v31-runtime-guards.js";

export type RunnerClaimResult = { status: "NO_WORK" } | (V31RunnerJobRecord & { claimStatus: "LEASED" });
export type RunnerInputResult = V31RunnerInputResponse;

export class RunnerLeaseLostError extends Error {
  constructor() { super("runner job lease was lost or expired"); this.name = "RunnerLeaseLostError"; }
}

/** Host-only client. Keep this credential in the trusted Runner Host, never in API or Web. */
export class V31RunnerHostApiClient {
  private readonly generated: GeneratedRunnerHostClient;
  constructor(baseUrl: string, bearerToken: string, private readonly request: typeof fetch = fetch) {
    this.generated = new GeneratedRunnerHostClient(baseUrl, bearerToken, request);
  }

  async claim(workerId: string, testRunId?: string): Promise<RunnerClaimResult> {
    const command: V31RunnerClaimCommand = { workerId, ...(testRunId ? { testRunId } : {}) };
    return this.mapLeaseError(this.generated.claimRunnerJob(command));
  }

  async readInput(jobId: string, lease: RunnerJobLease): Promise<RunnerInputResult> {
    const command: V31RunnerInputRequest = { workerId: lease.workerId, fencingToken: lease.fencingToken };
    return this.mapLeaseError(this.generated.readLeasedRunnerInput(jobId, command));
  }

  async heartbeat(jobId: string, lease: RunnerJobLease): Promise<V31RunnerJobRecord & { claimStatus: "LEASED" }> {
    const command: V31RunnerInputRequest = { workerId: lease.workerId, fencingToken: lease.fencingToken };
    return this.mapLeaseError(this.generated.renewRunnerJobLease(jobId, command));
  }

  async complete(jobId: string, lease: RunnerJobLease, execution: V31RunnerExecution, artifacts: V31ResearchArtifactRef[]): Promise<V31RunnerJobRecord> {
    const command: V31RunnerCompleteCommand = { workerId: lease.workerId, fencingToken: lease.fencingToken, execution, artifacts };
    return this.mapLeaseError(this.generated.completeLeasedRunnerJob(jobId, command));
  }

  async publishArtifact(jobId: string, lease: RunnerJobLease, ref: V31ResearchArtifactRef, content: Uint8Array): Promise<{ status: "PUBLISHED"; persisted: boolean; ref: V31ResearchArtifactRef }> {
    if (content.byteLength > 8 * 1024 * 1024) throw new Error("runner output artifact exceeds 8 MiB limit");
    if (sha256(content) !== ref.sha256) throw new Error("runner output artifact hash does not match its reference");
    const command = { jobId, workerId: lease.workerId, fencingToken: lease.fencingToken, ref, contentBase64: Buffer.from(content).toString("base64") };
    return this.mapLeaseError(this.generated.publishRunnerOutputArtifact(command));
  }

  async readCheckpoint(jobId: string, lease: RunnerJobLease): Promise<V33RunnerCheckpointReadResult> {
    const command: V31RunnerInputRequest = { workerId: lease.workerId, fencingToken: lease.fencingToken };
    return this.mapLeaseError(this.generated.readRunnerCheckpoint(jobId, command));
  }

  async persistCheckpoint(jobId: string, lease: RunnerJobLease, checkpoint: Omit<V33RunnerCheckpointCommand, "workerId" | "fencingToken">): Promise<V33RunnerCheckpointResult> {
    return this.mapLeaseError(this.generated.persistRunnerCheckpoint(jobId, { ...checkpoint, workerId: lease.workerId, fencingToken: lease.fencingToken }));
  }

  private async mapLeaseError<T>(operation: Promise<T>): Promise<T> {
    try { return await operation; }
    catch (error) {
      if (error instanceof RunnerHostHttpError && error.status === 409) throw new RunnerLeaseLostError();
      if (error instanceof RunnerHostHttpError) throw new Error(`runner API request failed with HTTP ${error.status}`);
      throw error;
    }
  }
}
