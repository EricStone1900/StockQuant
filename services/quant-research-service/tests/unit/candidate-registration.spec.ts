import { describe, expect, it } from "vitest";
import { decideCandidateRegistration, parseCandidateRegistrationCommand, type CandidateRegistration } from "../../src/candidate-registration.js";

const candidate: CandidateRegistration = { candidateId: "candidate-1", qlibVersion: "0.9.6", algorithm: "deterministic-sma", artifactHash: "a".repeat(64), approvedBy: "owner-1" };

describe("immutable candidate registration", () => {
  it("creates a first candidate approval", () => {
    expect(decideCandidateRegistration(null, candidate)).toEqual({ kind: "CREATE" });
  });

  it("treats an exact request replay as idempotent", () => {
    expect(decideCandidateRegistration(candidate, { ...candidate })).toEqual({ kind: "IDEMPOTENT_REPLAY" });
  });

  it.each([
    ["candidateId", "candidate-2"],
    ["qlibVersion", "0.9.7"],
    ["algorithm", "different-algorithm"],
    ["artifactHash", "b".repeat(64)],
    ["approvedBy", "owner-2"]
  ] as const)("rejects a replay that changes %s", (field, value) => {
    expect(decideCandidateRegistration(candidate, { ...candidate, [field]: value })).toEqual({ kind: "CONFLICT", reason: "CANDIDATE_ID_ALREADY_BOUND_TO_DIFFERENT_APPROVAL" });
  });

  it("enforces the generated registration command boundary at runtime", () => {
    expect(parseCandidateRegistrationCommand({ qlibVersion: "0.9.6", algorithm: "deterministic-sma", artifactHash: "a".repeat(64) }).ok).toBe(true);
    expect(parseCandidateRegistrationCommand({ qlibVersion: "0.9.6", algorithm: "deterministic-sma", artifactHash: "a".repeat(64), extra: true })).toMatchObject({ ok: false });
    expect(parseCandidateRegistrationCommand({ qlibVersion: "0.9.6", algorithm: "deterministic-sma", artifactHash: "a".repeat(64), candidateId: " " })).toMatchObject({ ok: false });
    expect(parseCandidateRegistrationCommand({ qlibVersion: "0.9.6", algorithm: "deterministic-sma", artifactHash: "a".repeat(64), approvedBy: 42 })).toMatchObject({ ok: false });
  });
});
