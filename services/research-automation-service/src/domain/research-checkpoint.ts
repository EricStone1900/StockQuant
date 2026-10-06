import { createHash } from "node:crypto";

export type ResearchCheckpointInput = {
  schemaVersion: "v3.3-research-checkpoint-v1";
  testRunId: string;
  roundIndex: number;
  sequence: number;
  state: Record<string, unknown>;
};

export type ResearchCheckpoint = ResearchCheckpointInput & {
  experimentId: string;
  stateSha256: string;
  createdAt: string;
};

export class ResearchCheckpointConflict extends Error {
  constructor(message: string, readonly statusCode = 422) {
    super(message);
    this.name = "ResearchCheckpointConflict";
  }
}

function canonical(value: unknown, depth = 0): string {
  if (depth > 32) throw new ResearchCheckpointConflict("checkpoint state nesting exceeds 32 levels");
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new ResearchCheckpointConflict("checkpoint state contains a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item, depth + 1)).join(",")}]`;
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ResearchCheckpointConflict("checkpoint state must contain only JSON values");
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item, depth + 1)}`).join(",")}}`;
}

export function hashResearchCheckpointState(state: Record<string, unknown>): string {
  return createHash("sha256").update(canonical(state)).digest("hex");
}

export function createResearchCheckpoint(
  experimentId: string,
  input: unknown,
  createdAt: Date,
): ResearchCheckpoint {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
  if (!uuid.test(experimentId)) throw new ResearchCheckpointConflict("experimentId must be a UUID");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ResearchCheckpointConflict("checkpoint must be an object");
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => !["schemaVersion", "testRunId", "roundIndex", "sequence", "state"].includes(key))) {
    throw new ResearchCheckpointConflict("checkpoint contains an unknown field");
  }
  if (record.schemaVersion !== "v3.3-research-checkpoint-v1" || typeof record.testRunId !== "string" || !uuid.test(record.testRunId)) {
    throw new ResearchCheckpointConflict("checkpoint schemaVersion and TestRun UUID are required");
  }
  if (!Number.isSafeInteger(record.roundIndex) || Number(record.roundIndex) < 1 || Number(record.roundIndex) > 3) {
    throw new ResearchCheckpointConflict("roundIndex must be an integer from 1 to 3");
  }
  if (!Number.isSafeInteger(record.sequence) || Number(record.sequence) < 1) {
    throw new ResearchCheckpointConflict("sequence must be a positive safe integer");
  }
  if (!record.state || typeof record.state !== "object" || Array.isArray(record.state)) {
    throw new ResearchCheckpointConflict("checkpoint state must be a JSON object");
  }
  const stateText = canonical(record.state);
  if (Buffer.byteLength(stateText, "utf8") > 256 * 1024) throw new ResearchCheckpointConflict("checkpoint state exceeds 256 KiB", 413);
  if (!(createdAt instanceof Date) || !Number.isFinite(createdAt.getTime())) throw new ResearchCheckpointConflict("checkpoint time is invalid");
  return {
    schemaVersion: "v3.3-research-checkpoint-v1",
    testRunId: record.testRunId,
    experimentId,
    roundIndex: Number(record.roundIndex),
    sequence: Number(record.sequence),
    state: record.state as Record<string, unknown>,
    stateSha256: createHash("sha256").update(stateText).digest("hex"),
    createdAt: createdAt.toISOString(),
  };
}
