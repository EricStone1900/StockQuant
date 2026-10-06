import type { ResearchCheckpoint } from "../domain/research-checkpoint.js";

export type CheckpointAppendResult = { checkpoint: ResearchCheckpoint; existing: boolean };

export interface ResearchCheckpointRepository {
  append(checkpoint: ResearchCheckpoint): Promise<CheckpointAppendResult>;
  latest(testRunId: string, experimentId: string, roundIndex: number): Promise<ResearchCheckpoint | null>;
  list(testRunId: string, experimentId: string, roundIndex: number): Promise<ResearchCheckpoint[]>;
}
