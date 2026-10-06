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
}
export { MINUTE_UPLOAD_CHUNK_BYTES, MINUTE_UPLOAD_MAX_BYTES, MINUTE_UPLOAD_MAX_OPEN_PER_OWNER, MINUTE_UPLOAD_MAX_RESERVED_BYTES_PER_OWNER, MinuteUploadConflict, MinuteUploadQuotaExceeded } from "../domain/minute-upload.js";
export type { MinuteUploadMetadata, MinuteUploadProgress, MinuteUploadStatus } from "../domain/minute-upload.js";
