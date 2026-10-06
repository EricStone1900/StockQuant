import type { QuantCandidateRegistrationResult } from "../contracts/generated-types.js";
import { decideCandidateRegistration, parseCandidateRegistrationCommand, type CandidateRegistration } from "../domain/candidate-registration.js";
import type { CandidateRegistrationRepository } from "../ports/candidate-registration-repository.js";

export type CandidateRegistrationResponse = { status: number; body: unknown };
const APPROVED_ARTIFACT_HASH = "e6586d4135eeeed375eb521b003c346a3f16b21da5f310cdd88ed67ee21e59b7";

export class CandidateRegistrationService {
  constructor(private readonly repository: CandidateRegistrationRepository) {}

  async register(input: unknown, requester: string | undefined): Promise<CandidateRegistrationResponse> {
    const parsed = parseCandidateRegistrationCommand(input);
    if (!parsed.ok) return { status: 422, body: { status: "REJECTED", reason: parsed.reason } };
    const command = parsed.value;
    if (command.artifactHash !== APPROVED_ARTIFACT_HASH) return { status: 422, body: { status: "REJECTED", reason: "candidate artifact hash does not match the approved artifact" } };
    if (!command.approvedBy) return { status: 202, body: { status: "PENDING_APPROVAL", reason: "explicit user approval is required" } };
    if (!requester || requester !== command.approvedBy) return { status: 403, body: { status: "REJECTED", reason: "approvedBy must match the authenticated x-stockquant-user" } };

    const registration: CandidateRegistration = {
      candidateId: command.candidateId ?? command.artifactHash,
      qlibVersion: command.qlibVersion,
      algorithm: command.algorithm,
      artifactHash: command.artifactHash,
      approvedBy: command.approvedBy,
    };
    const created = await this.repository.create(registration);
    let record = created;
    let idempotent = false;
    if (!record) {
      record = await this.repository.find(registration.candidateId);
      if (!record) return { status: 409, body: { status: "CONFLICT", reason: "candidate registration raced with a concurrent state change" } };
      const decision = decideCandidateRegistration(record, registration);
      if (decision.kind === "CONFLICT") return { status: 409, body: { status: "CONFLICT", reason: decision.reason } };
      idempotent = true;
    }

    const body = {
      candidateId: record.candidateId,
      qlibVersion: "0.9.6" as const,
      algorithm: "deterministic-sma" as const,
      artifactHash: registration.artifactHash,
      approvedBy: registration.approvedBy,
      status: "CANDIDATE_APPROVED" as const,
      activation: "DISABLED_UNTIL_MANDATE" as const,
      createdAt: record.createdAt.toISOString(),
      idempotent,
    } satisfies QuantCandidateRegistrationResult;
    return { status: idempotent ? 200 : 201, body };
  }

  async get(candidateId: string): Promise<Omit<QuantCandidateRegistrationResult, "idempotent"> | null> {
    const record = await this.repository.find(candidateId);
    if (!record) return null;
    return {
      candidateId: record.candidateId,
      qlibVersion: "0.9.6",
      algorithm: "deterministic-sma",
      artifactHash: record.artifactHash,
      approvedBy: record.approvedBy,
      status: record.status,
      activation: record.activation,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
