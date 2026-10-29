import type { MinuteUploadMetadata, MinuteUploadProgress } from "../domain/minute-upload.js";
export interface MinuteUploadPort {
  migrate(): Promise<void>;
  create(input: { uploadId: string; ownerId: string; expectedSha256: string; expectedBytes: number; metadata: MinuteUploadMetadata }): Promise<{ progress: MinuteUploadProgress; idempotent: boolean }>;
  putChunk(input: { ownerId: string; uploadId: string; index: number; content: Buffer; sha256: string }): Promise<{ progress: MinuteUploadProgress; idempotent: boolean }>;
  progress(ownerId: string, uploadId: string): Promise<MinuteUploadProgress>;
  beginFinalization(ownerId: string, uploadId: string): Promise<{ metadata: MinuteUploadMetadata; expectedSha256: string; expectedBytes: number; expectedChunks: number; alreadyCompleted: unknown | null }>;
  readFinalizationChunks(ownerId: string, uploadId: string, expectedChunks: number): AsyncGenerator<Buffer>;
  complete(ownerId: string, uploadId: string, result: unknown): Promise<MinuteUploadProgress>;
  releaseFinalization(ownerId: string, uploadId: string): Promise<void>;
  cancel(ownerId: string, uploadId: string): Promise<MinuteUploadProgress>;
  enqueueFinalization(ownerId: string, uploadId: string): Promise<MinuteUploadJob>;
  claimFinalization(workerId: string, leaseMs: number): Promise<MinuteUploadJobClaim | null>;
  completeFinalizationJob(uploadId: string, workerId: string, result: unknown): Promise<void>;
  failFinalizationJob(uploadId: string, workerId: string, reason: string): Promise<void>;
  finalizationJob(ownerId: string, uploadId: string): Promise<MinuteUploadJob | null>;
}
export { MINUTE_UPLOAD_CHUNK_BYTES, MINUTE_UPLOAD_MAX_BYTES, MINUTE_UPLOAD_MAX_OPEN_PER_OWNER, MINUTE_UPLOAD_MAX_RESERVED_BYTES_PER_OWNER, MinuteUploadConflict, MinuteUploadQuotaExceeded } from "../domain/minute-upload.js";
export type { MinuteUploadMetadata, MinuteUploadProgress, MinuteUploadStatus } from "../domain/minute-upload.js";
export type MinuteUploadJob = { uploadId: string; ownerId: string; status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED"; attempt: number; error: string | null; result: unknown | null };
export type MinuteUploadJobClaim = MinuteUploadJob & { status: "RUNNING"; workerId: string; leaseUntil: string };
