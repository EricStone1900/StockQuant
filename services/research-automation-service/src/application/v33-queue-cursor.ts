import type { RunnerJobCursor } from "./v31-runner-jobs.js";

export function encodeRunnerJobCursor(cursor: RunnerJobCursor): string {
  if (!Number.isFinite(Date.parse(cursor.submittedAt)) || new Date(cursor.submittedAt).toISOString() !== cursor.submittedAt
    || typeof cursor.jobId !== "string" || cursor.jobId.length < 1 || cursor.jobId.length > 512) throw new TypeError("invalid runner queue cursor");
  return Buffer.from(JSON.stringify({ submittedAt: cursor.submittedAt, jobId: cursor.jobId }), "utf8").toString("base64url");
}

export function decodeRunnerJobCursor(value: string): RunnerJobCursor | null {
  if (!/^[A-Za-z0-9_-]{1,2048}$/u.test(value)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (Object.keys(record).sort().join("|") !== "jobId|submittedAt" || typeof record.jobId !== "string" || record.jobId.length < 1 || record.jobId.length > 512
      || typeof record.submittedAt !== "string" || !Number.isFinite(Date.parse(record.submittedAt)) || new Date(record.submittedAt).toISOString() !== record.submittedAt) return null;
    return { jobId: record.jobId, submittedAt: record.submittedAt };
  } catch { return null; }
}
