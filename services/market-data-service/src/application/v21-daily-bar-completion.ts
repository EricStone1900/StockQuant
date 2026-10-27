import { createHash } from "node:crypto";

export type DailyBarFixtureRow = {
  securityId: string;
  sessionDate: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
  amount: string;
};

export type DailyBarCompletionRequest = {
  sourceId: string;
  dataMode: "FIXTURE" | "REAL";
  scope: { market: "CN_A"; ownerId: string; accountId: string | null; namespace: string | null; testRunId: string | null };
  fixtureVersion: string | null;
  dataVersion: string;
  sessionDate: string;
  expectedSecurityIds: string[];
  bars: DailyBarFixtureRow[];
  sessionCloseAt: string;
  completionRequestedAt: string;
  availableAt: string;
};

export type DailyBarCompletionResult = {
  status: "COMPLETED_FIXTURE" | "COMPLETED_REAL" | "BLOCKED_SOURCE_AUTHORIZATION" | "REJECTED";
  reason: string | null;
  completionId: string | null;
  dataVersion: string;
  fixtureVersion: string | null;
  sessionDate: string;
  sourceId: string;
  dataMode: "FIXTURE" | "REAL";
  scope: DailyBarCompletionRequest["scope"];
  availableAt: string | null;
  bars: DailyBarFixtureRow[];
};

const timestamp = (value: string): number => {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

type DecimalParts = { units: bigint; scale: number };
const decimal = (value: string): DecimalParts | null => {
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/u.exec(value);
  if (!match) return null;
  const fraction = match[2] ?? "";
  return { units: BigInt(`${match[1]}${fraction}`), scale: fraction.length };
};
const compare = (left: DecimalParts, right: DecimalParts): number => {
  const scale = Math.max(left.scale, right.scale);
  const leftUnits = left.units * 10n ** BigInt(scale - left.scale);
  const rightUnits = right.units * 10n ** BigInt(scale - right.scale);
  return leftUnits < rightUnits ? -1 : leftUnits > rightUnits ? 1 : 0;
};

function reject(request: DailyBarCompletionRequest, reason: string): DailyBarCompletionResult {
  return { status: "REJECTED", reason, completionId: null, dataVersion: request.dataVersion, fixtureVersion: request.fixtureVersion, sessionDate: request.sessionDate, sourceId: request.sourceId, dataMode: request.dataMode, scope: request.scope, availableAt: null, bars: [] };
}

/** Validates a completed independent DAILY_BAR source batch. Snapshot quotes are never accepted here. */
export function validateDailyBarCompletion(request: DailyBarCompletionRequest, gate: { sourceAuthorized: boolean }): DailyBarCompletionResult {
  if (request.dataMode === "REAL" && !gate.sourceAuthorized) return { ...reject(request, "SOURCE_AUTHORIZATION_REQUIRED"), status: "BLOCKED_SOURCE_AUTHORIZATION" };
  if (!request.sourceId || /snapshot/iu.test(request.sourceId)) return reject(request, "INDEPENDENT_DAILY_BAR_SOURCE_REQUIRED");
  if (!request.dataVersion.trim() || (request.dataMode === "FIXTURE" && !request.fixtureVersion?.trim())) return reject(request, "DAILY_BAR_VERSION_REQUIRED");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(request.sessionDate)) return reject(request, "INVALID_SESSION_DATE");
  const [year, month, day] = request.sessionDate.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) return reject(request, "INVALID_SESSION_DATE");

  const closeAt = timestamp(request.sessionCloseAt);
  const requestedAt = timestamp(request.completionRequestedAt);
  const availableAt = timestamp(request.availableAt);
  if (![closeAt, requestedAt, availableAt].every(Number.isFinite)) return reject(request, "INVALID_COMPLETION_TIMESTAMP");
  if (requestedAt < closeAt) return reject(request, "SESSION_NOT_CLOSED");
  if (availableAt < closeAt || availableAt < requestedAt) return reject(request, "DAILY_BAR_NOT_AVAILABLE");

  if (!request.expectedSecurityIds.length || new Set(request.expectedSecurityIds).size !== request.expectedSecurityIds.length) return reject(request, "INVALID_EXPECTED_SECURITIES");
  if (request.bars.length !== request.expectedSecurityIds.length) return reject(request, "DAILY_BAR_COVERAGE_INCOMPLETE");
  const expected = new Set(request.expectedSecurityIds);
  const seen = new Set<string>();
  for (const bar of request.bars) {
    if (!expected.has(bar.securityId) || seen.has(bar.securityId)) return reject(request, "DAILY_BAR_SCOPE_OR_DUPLICATE_MISMATCH");
    seen.add(bar.securityId);
    if (bar.sessionDate !== request.sessionDate) return reject(request, "DAILY_BAR_SESSION_MISMATCH");
    const open = decimal(bar.open); const high = decimal(bar.high); const low = decimal(bar.low); const close = decimal(bar.close); const amount = decimal(bar.amount); const zero = { units: 0n, scale: 0 };
    if (!open || !high || !low || !close || !amount || [open, high, low, close].some((value) => compare(value, zero) <= 0) || compare(low, open) > 0 || compare(low, close) > 0 || compare(high, open) < 0 || compare(high, close) < 0 || compare(high, low) < 0 || !Number.isSafeInteger(bar.volume) || bar.volume < 0 || compare(amount, zero) < 0) return reject(request, "DAILY_BAR_VALUE_INVALID");
  }

  const canonicalBars = [...request.bars].sort((left, right) => left.securityId.localeCompare(right.securityId));
  const identity = JSON.stringify({ scope: request.scope, sourceId: request.sourceId, dataMode: request.dataMode, fixtureVersion: request.fixtureVersion, dataVersion: request.dataVersion, sessionDate: request.sessionDate, expectedSecurityIds: [...request.expectedSecurityIds].sort(), bars: canonicalBars });
  const completionId = `dailybar:${createHash("sha256").update(identity).digest("hex")}`;
  return { status: request.dataMode === "FIXTURE" ? "COMPLETED_FIXTURE" : "COMPLETED_REAL", reason: null, completionId, dataVersion: request.dataVersion, fixtureVersion: request.fixtureVersion, sessionDate: request.sessionDate, sourceId: request.sourceId, dataMode: request.dataMode, scope: request.scope, availableAt: request.availableAt, bars: canonicalBars };
}
