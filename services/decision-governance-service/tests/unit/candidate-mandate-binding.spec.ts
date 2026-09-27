import { describe, expect, it, vi } from "vitest";
import { assessCandidateMandateBinding, type CandidateMandateBindingCommand } from "../../src/domain/candidate-mandate-binding.js";

const command: CandidateMandateBindingCommand = {
  schemaVersion: "v3.2-candidate-mandate-binding-command-v1",
  mandateId: "11111111-1111-4111-8111-111111111111",
  testRunId: "22222222-2222-4222-8222-222222222222",
  ownerId: "acceptance-owner-1",
  accountId: "44444444-4444-4444-8444-444444444444",
  market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE",
  strategyVersion: "a".repeat(64),
  candidateArtifact: { artifactId: "candidate-1", namespace: "research/run/outputs", sha256: "b".repeat(64) }
};
const registry = {
  schemaVersion: "v3.2-promotion-registry-version-v1",
  promotionRequestId: "55555555-5555-4555-8555-555555555555",
  versionFingerprint: command.strategyVersion,
  candidateArtifact: command.candidateArtifact,
  codeSha256: "c".repeat(64), dataManifestSha256: "d".repeat(64), metricsManifestSha256: "e".repeat(64), validationPlanSha256: "f".repeat(64),
  approvedBy: "owner-1", status: "CANDIDATE_APPROVED", activation: "DISABLED_UNTIL_MANDATE"
} as const;

describe("exact candidate to simulated Mandate binding assessment", () => {
  it("matches only the approved exact fingerprint and Artifact identity, without activation", async () => {
    const lookup = vi.fn().mockResolvedValue({ status: 200, body: registry });
    const result = await assessCandidateMandateBinding(command, lookup);
    expect(lookup).toHaveBeenCalledWith(command.strategyVersion);
    expect(result).toMatchObject({ status: "EXACT_VERSION_MATCH_READY_FOR_MANDATE_REVIEW", versionFingerprint: command.strategyVersion, activation: "DISABLED_UNTIL_MANDATE", brokerMode: "FAKE" });
    expect(result).not.toHaveProperty("active");
  });
  it("rejects a different fingerprint, Artifact, status, or enabled-state claim", async () => {
    for (const body of [
      { ...registry, versionFingerprint: "9".repeat(64) },
      { ...registry, candidateArtifact: { ...registry.candidateArtifact, sha256: "9".repeat(64) } },
      { ...registry, status: "REJECTED" },
      { ...registry, activation: "ACTIVE" }
    ]) expect((await assessCandidateMandateBinding(command, async () => ({ status: 200, body }))).status).toBe("REJECTED");
  });
  it("rejects missing approvals and malformed identity/scope without contacting Registry", async () => {
    const lookup = vi.fn();
    await expect(assessCandidateMandateBinding({ ...command, strategyVersion: "UNSET" }, lookup)).rejects.toThrow("command is invalid");
    await expect(assessCandidateMandateBinding({ ...command, brokerMode: "REAL" } as unknown as CandidateMandateBindingCommand, lookup)).rejects.toThrow("command is invalid");
    expect(lookup).not.toHaveBeenCalled();
  });
  it("keeps lookup outage waiting and missing exact Registry version rejected", async () => {
    expect((await assessCandidateMandateBinding(command, async () => ({ status: 503 }))).status).toBe("WAITING");
    expect((await assessCandidateMandateBinding(command, async () => ({ status: 404 }))).status).toBe("REJECTED");
  });
});
