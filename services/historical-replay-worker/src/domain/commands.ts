import type { HistoricalReplayCommand, HistoricalReplayMultiCommand } from "../contracts/generated-types.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PRICE = /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u;
const DATE_TIME_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;
const ROOT_KEYS = ["testRunId", "namespace", "ownerId", "scenarioId", "seed"];

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("replay command must be a JSON object");
  return value as Record<string, unknown>;
}

function validateBase(value: Record<string, unknown>, multi: boolean): void {
  const allowed = [...ROOT_KEYS, multi ? "bars" : "bar"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error("replay command contains unsupported properties");
  if (typeof value.testRunId !== "string" || !UUID.test(value.testRunId)) throw new Error("testRunId must be a UUID");
  if (typeof value.namespace !== "string" || value.namespace.length < 1 || value.namespace.length > 512) throw new Error("namespace must be 1-512 characters");
  if (typeof value.ownerId !== "string" || value.ownerId.length < 1 || value.ownerId.length > 128) throw new Error("ownerId must be 1-128 characters");
  if (value.scenarioId !== "normal" && value.scenarioId !== "recovery") throw new Error("scenarioId must be normal or recovery");
  if (!Number.isSafeInteger(value.seed) || Number(value.seed) < 0 || Number(value.seed) > 2_147_483_647) throw new Error("seed must be a non-negative int32");
}

function validateBar(value: unknown): HistoricalReplayCommand["bar"] {
  const bar = record(value);
  if (Object.keys(bar).some((key) => !["timestamp", "open", "volume"].includes(key))) throw new Error("replay bar contains unsupported properties");
  if (typeof bar.timestamp !== "string" || !DATE_TIME_WITH_ZONE.test(bar.timestamp) || !Number.isFinite(Date.parse(bar.timestamp))) throw new Error("bar timestamp must be an ISO-8601 date-time with an offset");
  if (typeof bar.open !== "string" || !PRICE.test(bar.open)) throw new Error("bar open must be a non-negative decimal with at most four places");
  if (!Number.isSafeInteger(bar.volume) || Number(bar.volume) < 0) throw new Error("bar volume must be a non-negative safe integer");
  return { timestamp: bar.timestamp, open: bar.open, volume: Number(bar.volume) };
}

export function parseHistoricalReplayCommand(input: unknown): HistoricalReplayCommand {
  const body = record(input);
  validateBase(body, false);
  return { testRunId: body.testRunId as string, namespace: body.namespace as string, ownerId: body.ownerId as string, scenarioId: body.scenarioId as HistoricalReplayCommand["scenarioId"], seed: Number(body.seed), bar: validateBar(body.bar) };
}

export function parseHistoricalReplayMultiCommand(input: unknown): HistoricalReplayMultiCommand {
  const body = record(input);
  validateBase(body, true);
  if (!Array.isArray(body.bars) || body.bars.length < 1) throw new Error("bars must contain at least one historical bar");
  return { testRunId: body.testRunId as string, namespace: body.namespace as string, ownerId: body.ownerId as string, scenarioId: body.scenarioId as HistoricalReplayMultiCommand["scenarioId"], seed: Number(body.seed), bars: body.bars.map(validateBar) };
}

export function isReplayTestRunId(value: string): boolean { return UUID.test(value); }
