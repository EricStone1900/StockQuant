import type { GapRecord } from "./minute-quality.js";

export type GapRequestBody = {
  subscriptionId?: unknown;
  fromDate?: unknown;
  toDate?: unknown;
  securityIds?: unknown;
  gaps?: unknown;
};

export type ValidatedGapRequest = {
  subscriptionId: string;
  fromDate: string;
  toDate: string;
  securityIds: string[];
  gaps: GapRecord[];
};

export type GapRequestValidation = { ok: true; value: ValidatedGapRequest } | { ok: false; code: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REASONS = new Set(["MISSING", "DUPLICATE_CONFLICT"]);
const PRIORITIES = new Set(["P0", "P1", "P2"]);

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function shanghaiDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function validateGapRequest(body: GapRequestBody): GapRequestValidation {
  if (typeof body.subscriptionId !== "string" || !body.subscriptionId.trim()) return { ok: false, code: "INVALID_GAP_INPUT" };
  if (!validDate(body.fromDate) || !validDate(body.toDate) || body.fromDate > body.toDate) return { ok: false, code: "INVALID_GAP_DATE_RANGE" };
  if (!Array.isArray(body.securityIds) || body.securityIds.length === 0 || body.securityIds.some((item) => typeof item !== "string" || !item.trim())) return { ok: false, code: "INVALID_GAP_SECURITIES" };
  const securityIds = body.securityIds.map((item) => String(item).trim());
  if (new Set(securityIds).size !== securityIds.length) return { ok: false, code: "DUPLICATE_GAP_SECURITIES" };
  if (!Array.isArray(body.gaps)) return { ok: false, code: "INVALID_GAP_INPUT" };
  const gaps: GapRecord[] = [];
  for (const item of body.gaps) {
    if (!item || typeof item !== "object") return { ok: false, code: "INVALID_GAP_INPUT" };
    const gap = item as Record<string, unknown>;
    if (typeof gap.gapId !== "string" || !gap.gapId.trim() || typeof gap.securityId !== "string" || !securityIds.includes(gap.securityId)) return { ok: false, code: "GAP_SECURITY_OUT_OF_SCOPE" };
    if (typeof gap.barStart !== "string" || typeof gap.barEnd !== "string") return { ok: false, code: "INVALID_GAP_BAR_RANGE" };
    const start = new Date(gap.barStart);
    const end = new Date(gap.barEnd);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || shanghaiDate(gap.barStart) < body.fromDate || shanghaiDate(gap.barStart) > body.toDate) return { ok: false, code: "INVALID_GAP_BAR_RANGE" };
    if (typeof gap.reason !== "string" || !REASONS.has(gap.reason) || typeof gap.priority !== "string" || !PRIORITIES.has(gap.priority)) return { ok: false, code: "INVALID_GAP_INPUT" };
    gaps.push({ gapId: gap.gapId, securityId: gap.securityId, barStart: gap.barStart, barEnd: gap.barEnd, reason: gap.reason as GapRecord["reason"], priority: gap.priority as GapRecord["priority"] });
  }
  return { ok: true, value: { subscriptionId: body.subscriptionId.trim(), fromDate: body.fromDate, toDate: body.toDate, securityIds, gaps } };
}
