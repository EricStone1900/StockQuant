import { describe, expect, it, vi } from "vitest";
import { CandidateRegistrationService } from "../../src/application/candidate-registration-service.js";

const artifactHash = "e6586d4135eeeed375eb521b003c346a3f16b21da5f310cdd88ed67ee21e59b7";
const command = { candidateId: "fixture-candidate", qlibVersion: "0.9.6", algorithm: "deterministic-sma", artifactHash, approvedBy: "reviewer-1" };
const record = { ...command, status: "CANDIDATE_APPROVED" as const, activation: "DISABLED_UNTIL_MANDATE" as const, createdAt: new Date("2026-01-01T00:00:00Z") };

describe("CandidateRegistrationService", () => {
  it("returns creation and idempotent replay outcomes through the repository port", async () => {
    const repository = { create: vi.fn().mockResolvedValueOnce(record).mockResolvedValueOnce(null), find: vi.fn().mockResolvedValue(record) };
    const service = new CandidateRegistrationService(repository);

    const created = await service.register(command, "reviewer-1");
    const replayed = await service.register(command, "reviewer-1");

    expect(created).toMatchObject({ status: 201, body: { candidateId: "fixture-candidate", idempotent: false } });
    expect(replayed).toMatchObject({ status: 200, body: { candidateId: "fixture-candidate", idempotent: true } });
    expect(repository.find).toHaveBeenCalledExactlyOnceWith("fixture-candidate");
  });

  it("rejects an authenticated reviewer mismatch before repository writes", async () => {
    const repository = { create: vi.fn(), find: vi.fn() };
    const service = new CandidateRegistrationService(repository);

    const result = await service.register(command, "different-reviewer");

    expect(result).toMatchObject({ status: 403 });
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.find).not.toHaveBeenCalled();
  });
});
