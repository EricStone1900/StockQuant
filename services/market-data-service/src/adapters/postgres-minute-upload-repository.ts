import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { MINUTE_UPLOAD_CHUNK_BYTES, MINUTE_UPLOAD_MAX_BYTES, MINUTE_UPLOAD_MAX_OPEN_PER_OWNER, MINUTE_UPLOAD_MAX_RESERVED_BYTES_PER_OWNER, MinuteUploadConflict, MinuteUploadQuotaExceeded, type MinuteUploadMetadata, type MinuteUploadProgress, type MinuteUploadStatus } from "../domain/minute-upload.js";
import type { MinuteUploadPort } from "../ports/minute-upload.js";
export { MINUTE_UPLOAD_CHUNK_BYTES, MINUTE_UPLOAD_MAX_BYTES, MinuteUploadConflict, MinuteUploadQuotaExceeded } from "../domain/minute-upload.js";
export type { MinuteUploadMetadata, MinuteUploadProgress, MinuteUploadStatus } from "../domain/minute-upload.js";

type UploadRow = { upload_id: string; owner_id: string; expected_sha256: string; expected_bytes: number; expected_chunks: number; metadata: MinuteUploadMetadata; status: MinuteUploadStatus; completed_result: unknown | null };

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

export class MinuteUploadRepository implements MinuteUploadPort {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS market_data_minute_uploads (
        upload_id UUID PRIMARY KEY,
        owner_id TEXT NOT NULL,
        expected_sha256 TEXT NOT NULL CHECK (expected_sha256 ~ '^[0-9a-f]{64}$'),
        expected_bytes INTEGER NOT NULL CHECK (expected_bytes BETWEEN 1 AND ${MINUTE_UPLOAD_MAX_BYTES}),
        expected_chunks INTEGER NOT NULL CHECK (expected_chunks BETWEEN 1 AND 128),
        metadata JSONB NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('OPEN','FINALIZING','COMPLETED','CANCELLED')),
        completed_result JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS market_data_minute_uploads_owner_status_idx ON market_data_minute_uploads(owner_id,status,created_at);
      CREATE TABLE IF NOT EXISTS market_data_minute_upload_chunks (
        upload_id UUID NOT NULL REFERENCES market_data_minute_uploads(upload_id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
        chunk_sha256 TEXT NOT NULL CHECK (chunk_sha256 ~ '^[0-9a-f]{64}$'),
        content BYTEA NOT NULL,
        PRIMARY KEY(upload_id,chunk_index)
      );
    `);
  }

  async create(input: { uploadId: string; ownerId: string; expectedSha256: string; expectedBytes: number; metadata: MinuteUploadMetadata }): Promise<{ progress: MinuteUploadProgress; idempotent: boolean }> {
    if (!/^[0-9a-f]{64}$/u.test(input.expectedSha256)) throw new Error("expectedSha256 must be lowercase SHA-256");
    if (!input.ownerId || input.ownerId.length > 128) throw new Error("ownerId is invalid");
    if (!Number.isSafeInteger(input.expectedBytes) || input.expectedBytes < 1 || input.expectedBytes > MINUTE_UPLOAD_MAX_BYTES) throw new Error(`expectedBytes must be between 1 and ${MINUTE_UPLOAD_MAX_BYTES}`);
    const expectedChunks = Math.ceil(input.expectedBytes / MINUTE_UPLOAD_CHUNK_BYTES);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`minute-upload-owner:${input.ownerId}`]);
      const existing = await client.query<UploadRow>("SELECT * FROM market_data_minute_uploads WHERE upload_id=$1 FOR UPDATE", [input.uploadId]);
      if (existing.rowCount) {
        const row = existing.rows[0];
        if (row.owner_id !== input.ownerId || row.expected_sha256 !== input.expectedSha256 || row.expected_bytes !== input.expectedBytes || JSON.stringify(canonical(row.metadata)) !== JSON.stringify(canonical(input.metadata))) throw new MinuteUploadConflict("uploadId is already bound to different owner or content");
        await client.query("COMMIT");
        return { progress: await this.progress(input.ownerId, input.uploadId), idempotent: true };
      }
      const quota = await client.query<{ open_count: string; reserved_bytes: string }>("SELECT count(*) AS open_count, COALESCE(sum(expected_bytes),0) AS reserved_bytes FROM market_data_minute_uploads WHERE owner_id=$1 AND status IN ('OPEN','FINALIZING')", [input.ownerId]);
      if (Number(quota.rows[0].open_count) >= MINUTE_UPLOAD_MAX_OPEN_PER_OWNER || Number(quota.rows[0].reserved_bytes) + input.expectedBytes > MINUTE_UPLOAD_MAX_RESERVED_BYTES_PER_OWNER) throw new MinuteUploadQuotaExceeded("owner minute-upload quota exceeded");
      await client.query("INSERT INTO market_data_minute_uploads(upload_id,owner_id,expected_sha256,expected_bytes,expected_chunks,metadata,status) VALUES($1,$2,$3,$4,$5,$6::jsonb,'OPEN')", [input.uploadId,input.ownerId,input.expectedSha256,input.expectedBytes,expectedChunks,JSON.stringify(input.metadata)]);
      await client.query("COMMIT");
      return { progress: await this.progress(input.ownerId,input.uploadId), idempotent: false };
    } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  async putChunk(input: { ownerId: string; uploadId: string; index: number; content: Buffer; sha256: string }): Promise<{ progress: MinuteUploadProgress; idempotent: boolean }> {
    if (!Number.isSafeInteger(input.index) || input.index < 0) throw new Error("chunk index must be a non-negative integer");
    if (!Buffer.isBuffer(input.content) || input.content.length < 1 || input.content.length > MINUTE_UPLOAD_CHUNK_BYTES) throw new Error("chunk content size is invalid");
    const actualSha = createHash("sha256").update(input.content).digest("hex");
    if (actualSha !== input.sha256) throw new MinuteUploadConflict("chunk SHA-256 does not match content");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<UploadRow>("SELECT * FROM market_data_minute_uploads WHERE upload_id=$1 AND owner_id=$2 FOR UPDATE", [input.uploadId,input.ownerId]);
      const upload = result.rows[0];
      if (!upload) throw new MinuteUploadConflict("minute upload was not found for this owner");
      if (upload.status !== "OPEN") throw new MinuteUploadConflict(`cannot add chunks while upload is ${upload.status}`);
      if (input.index >= upload.expected_chunks) throw new MinuteUploadConflict("chunk index exceeds the declared upload");
      const expectedLength = input.index === upload.expected_chunks - 1 ? upload.expected_bytes - MINUTE_UPLOAD_CHUNK_BYTES * input.index : MINUTE_UPLOAD_CHUNK_BYTES;
      if (input.content.length !== expectedLength) throw new MinuteUploadConflict("chunk length does not match its declared position");
      const prior = await client.query<{ chunk_sha256: string; content: Buffer }>("SELECT chunk_sha256,content FROM market_data_minute_upload_chunks WHERE upload_id=$1 AND chunk_index=$2", [input.uploadId,input.index]);
      if (prior.rowCount) {
        if (prior.rows[0].chunk_sha256 !== actualSha || !prior.rows[0].content.equals(input.content)) throw new MinuteUploadConflict("chunk index already contains different bytes");
        await client.query("COMMIT");
        return { progress: await this.progress(input.ownerId,input.uploadId), idempotent: true };
      }
      await client.query("INSERT INTO market_data_minute_upload_chunks(upload_id,chunk_index,chunk_sha256,content) VALUES($1,$2,$3,$4)", [input.uploadId,input.index,actualSha,input.content]);
      await client.query("UPDATE market_data_minute_uploads SET updated_at=now() WHERE upload_id=$1", [input.uploadId]);
      await client.query("COMMIT");
      return { progress: await this.progress(input.ownerId,input.uploadId), idempotent: false };
    } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  async progress(ownerId: string, uploadId: string): Promise<MinuteUploadProgress> {
    const result = await this.pool.query<UploadRow & { received_bytes: string; received_chunks: number[] }>(`SELECT u.*,CASE WHEN u.status='COMPLETED' THEN u.expected_bytes ELSE COALESCE(sum(octet_length(c.content)),0) END AS received_bytes,CASE WHEN u.status='COMPLETED' THEN ARRAY(SELECT generate_series(0,u.expected_chunks-1)) ELSE COALESCE(array_agg(c.chunk_index ORDER BY c.chunk_index) FILTER (WHERE c.chunk_index IS NOT NULL),'{}') END AS received_chunks FROM market_data_minute_uploads u LEFT JOIN market_data_minute_upload_chunks c USING(upload_id) WHERE u.upload_id=$1 AND u.owner_id=$2 GROUP BY u.upload_id`, [uploadId,ownerId]);
    const row = result.rows[0];
    if (!row) throw new MinuteUploadConflict("minute upload was not found for this owner");
    return { uploadId, status: row.status, expectedBytes: row.expected_bytes, receivedBytes: Number(row.received_bytes), expectedChunks: row.expected_chunks, receivedChunks: row.received_chunks, result: row.completed_result };
  }

  async beginFinalization(ownerId: string, uploadId: string): Promise<{ metadata: MinuteUploadMetadata; expectedSha256: string; expectedBytes: number; expectedChunks: number; alreadyCompleted: unknown | null }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<UploadRow>("SELECT * FROM market_data_minute_uploads WHERE upload_id=$1 AND owner_id=$2 FOR UPDATE", [uploadId,ownerId]);
      const upload = result.rows[0];
      if (!upload) throw new MinuteUploadConflict("minute upload was not found for this owner");
      if (upload.status === "CANCELLED") throw new MinuteUploadConflict("cancelled upload cannot be finalized");
      if (upload.status === "COMPLETED") { await client.query("COMMIT"); return { metadata: upload.metadata, expectedSha256: upload.expected_sha256, expectedBytes: upload.expected_bytes, expectedChunks: upload.expected_chunks, alreadyCompleted: upload.completed_result }; }
      const chunks = await client.query<{ count: string; bytes: string; min_index: number | null; max_index: number | null }>("SELECT count(*) AS count,COALESCE(sum(octet_length(content)),0) AS bytes,min(chunk_index) AS min_index,max(chunk_index) AS max_index FROM market_data_minute_upload_chunks WHERE upload_id=$1", [uploadId]);
      if (Number(chunks.rows[0].count) !== upload.expected_chunks || Number(chunks.rows[0].bytes) !== upload.expected_bytes || chunks.rows[0].min_index !== 0 || chunks.rows[0].max_index !== upload.expected_chunks - 1) throw new MinuteUploadConflict("upload is missing one or more chunks");
      await client.query("UPDATE market_data_minute_uploads SET status='FINALIZING',updated_at=now() WHERE upload_id=$1", [uploadId]);
      await client.query("COMMIT");
      return { metadata: upload.metadata, expectedSha256: upload.expected_sha256, expectedBytes: upload.expected_bytes, expectedChunks: upload.expected_chunks, alreadyCompleted: null };
    } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  async *readFinalizationChunks(ownerId: string, uploadId: string, expectedChunks: number): AsyncGenerator<Buffer> {
    for (let index = 0; index < expectedChunks; index += 1) {
      const result = await this.pool.query<{ content: Buffer; chunk_sha256: string }>(`SELECT c.content,c.chunk_sha256 FROM market_data_minute_upload_chunks c
        JOIN market_data_minute_uploads u USING(upload_id) WHERE c.upload_id=$1 AND c.chunk_index=$2 AND u.owner_id=$3 AND u.status='FINALIZING'`, [uploadId,index,ownerId]);
      if (result.rowCount !== 1) throw new MinuteUploadConflict("upload chunk disappeared during finalization");
      const { content, chunk_sha256: expectedSha256 } = result.rows[0];
      if (createHash("sha256").update(content).digest("hex") !== expectedSha256) throw new MinuteUploadConflict("stored upload chunk hash does not match content");
      yield content;
    }
  }

  async complete(ownerId: string, uploadId: string, result: unknown): Promise<MinuteUploadProgress> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE market_data_minute_uploads SET status='COMPLETED',completed_result=$3::jsonb,updated_at=now() WHERE upload_id=$1 AND owner_id=$2 AND status IN ('OPEN','FINALIZING')", [uploadId,ownerId,JSON.stringify(result)]);
      await client.query("DELETE FROM market_data_minute_upload_chunks WHERE upload_id=$1 AND EXISTS (SELECT 1 FROM market_data_minute_uploads WHERE upload_id=$1 AND owner_id=$2 AND status='COMPLETED')", [uploadId,ownerId]);
      await client.query("COMMIT");
      return await this.progress(ownerId,uploadId);
    } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  async releaseFinalization(ownerId: string, uploadId: string): Promise<void> {
    await this.pool.query("UPDATE market_data_minute_uploads SET status='OPEN',updated_at=now() WHERE upload_id=$1 AND owner_id=$2 AND status='FINALIZING'", [uploadId,ownerId]);
  }

  async cancel(ownerId: string, uploadId: string): Promise<MinuteUploadProgress> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<UploadRow>("SELECT * FROM market_data_minute_uploads WHERE upload_id=$1 AND owner_id=$2 FOR UPDATE", [uploadId,ownerId]);
      const upload = result.rows[0];
      if (!upload) throw new MinuteUploadConflict("minute upload was not found for this owner");
      if (upload.status === "OPEN") {
        await client.query("DELETE FROM market_data_minute_upload_chunks WHERE upload_id=$1", [uploadId]);
        await client.query("UPDATE market_data_minute_uploads SET status='CANCELLED',updated_at=now() WHERE upload_id=$1", [uploadId]);
      } else if (upload.status !== "CANCELLED") throw new MinuteUploadConflict(`cannot cancel upload while it is ${upload.status}`);
      await client.query("COMMIT");
      return await this.progress(ownerId,uploadId);
    } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
    finally { client.release(); }
  }
}
