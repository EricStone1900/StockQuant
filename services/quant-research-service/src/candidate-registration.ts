export type CandidateRegistration = {
  candidateId: string;
  qlibVersion: string;
  algorithm: string;
  artifactHash: string;
  approvedBy: string;
};

export type CandidateRegistrationDecision =
  | { kind: "CREATE" }
  | { kind: "IDEMPOTENT_REPLAY" }
  | { kind: "CONFLICT"; reason: "CANDIDATE_ID_ALREADY_BOUND_TO_DIFFERENT_APPROVAL" };

export function parseCandidateRegistrationCommand(input: unknown): { ok: true; value: QuantCandidateRegistrationCommand } | { ok: false; reason: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, reason: "candidate registration command must be an object" };
  const body = input as Record<string, unknown>;
  const allowed = new Set(["candidateId", "qlibVersion", "algorithm", "artifactHash", "approvedBy"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) return { ok: false, reason: "candidate registration command contains an unknown property" };
  if (body.candidateId !== undefined && (typeof body.candidateId !== "string" || body.candidateId.trim().length === 0 || body.candidateId.length > 128)) return { ok: false, reason: "candidateId must contain 1 to 128 non-whitespace characters" };
  if (body.qlibVersion !== "0.9.6" || body.algorithm !== "deterministic-sma") return { ok: false, reason: "candidate version or algorithm is not eligible" };
  if (typeof body.artifactHash !== "string" || !/^[a-f0-9]{64}$/u.test(body.artifactHash)) return { ok: false, reason: "artifactHash must be a lowercase SHA-256" };
  if (body.approvedBy !== undefined && (typeof body.approvedBy !== "string" || body.approvedBy.trim().length === 0 || body.approvedBy.length > 128)) return { ok: false, reason: "approvedBy must contain 1 to 128 non-whitespace characters" };
  return { ok: true, value: body as unknown as QuantCandidateRegistrationCommand };
}

/** Candidate identity and its exact approver are immutable after first persistence. */
export function decideCandidateRegistration(existing: CandidateRegistration | null, requested: CandidateRegistration): CandidateRegistrationDecision {
  if (!existing) return { kind: "CREATE" };
  const identical = existing.candidateId === requested.candidateId
    && existing.qlibVersion === requested.qlibVersion
    && existing.algorithm === requested.algorithm
    && existing.artifactHash === requested.artifactHash
    && existing.approvedBy === requested.approvedBy;
  return identical
    ? { kind: "IDEMPOTENT_REPLAY" }
    : { kind: "CONFLICT", reason: "CANDIDATE_ID_ALREADY_BOUND_TO_DIFFERENT_APPROVAL" };
}
import type { QuantCandidateRegistrationCommand } from "./contracts/generated-types.js";
