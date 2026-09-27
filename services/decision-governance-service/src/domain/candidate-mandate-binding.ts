type RegistryVersion = {
  schemaVersion: "v3.2-promotion-registry-version-v1";
  promotionRequestId: string;
  versionFingerprint: string;
  candidateArtifact: { artifactId: string; namespace: string; sha256: string };
  codeSha256: string;
  dataManifestSha256: string;
  metricsManifestSha256: string;
  validationPlanSha256: string;
  approvedBy: string;
  status: "CANDIDATE_APPROVED";
  activation: "DISABLED_UNTIL_MANDATE";
};

export type CandidateMandateBindingCommand = {
  schemaVersion: "v3.2-candidate-mandate-binding-command-v1";
  mandateId: string;
  testRunId: string;
  ownerId: string;
  accountId: string;
  market: "CN_A";
  environmentMode: "PAPER";
  brokerMode: "FAKE";
  strategyVersion: string;
  candidateArtifact: RegistryVersion["candidateArtifact"];
};

export type RegistryLookup = (versionFingerprint: string) => Promise<{ status: number; body?: unknown }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256 = /^[a-f0-9]{64}$/u;
const OWNER_ID = /^[A-Za-z0-9._-]{1,128}$/u;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export async function assessCandidateMandateBinding(command: CandidateMandateBindingCommand, lookup: RegistryLookup): Promise<Record<string, unknown>> {
  const keys = ["schemaVersion", "mandateId", "testRunId", "ownerId", "accountId", "market", "environmentMode", "brokerMode", "strategyVersion", "candidateArtifact"];
  const candidateKeys = ["artifactId", "namespace", "sha256"];
  if (!isRecord(command) || Object.keys(command).sort().join("|") !== keys.sort().join("|") || command.schemaVersion !== "v3.2-candidate-mandate-binding-command-v1" || !UUID.test(command.mandateId) || !UUID.test(command.testRunId) || !OWNER_ID.test(command.ownerId) || !UUID.test(command.accountId) || command.market !== "CN_A" || command.environmentMode !== "PAPER" || command.brokerMode !== "FAKE" || !SHA256.test(command.strategyVersion) || !isRecord(command.candidateArtifact) || Object.keys(command.candidateArtifact).sort().join("|") !== candidateKeys.sort().join("|") || typeof command.candidateArtifact.artifactId !== "string" || command.candidateArtifact.artifactId.length === 0 || typeof command.candidateArtifact.namespace !== "string" || command.candidateArtifact.namespace.length === 0 || !SHA256.test(command.candidateArtifact.sha256)) {
    throw new Error("candidate Mandate binding command is invalid");
  }
  const result = await lookup(command.strategyVersion);
  if (result.status === 404) return { schemaVersion: "v3.2-candidate-mandate-binding-result-v1", status: "REJECTED", reason: "APPROVED_REGISTRY_VERSION_NOT_FOUND", mandateId: command.mandateId, versionFingerprint: command.strategyVersion };
  if (result.status !== 200 || !isRecord(result.body)) return { schemaVersion: "v3.2-candidate-mandate-binding-result-v1", status: "WAITING", reason: "REGISTRY_LOOKUP_UNAVAILABLE", mandateId: command.mandateId, versionFingerprint: command.strategyVersion };
  const registry = result.body as unknown as RegistryVersion;
  const exact = registry.schemaVersion === "v3.2-promotion-registry-version-v1"
    && UUID.test(registry.promotionRequestId)
    && registry.versionFingerprint === command.strategyVersion
    && registry.status === "CANDIDATE_APPROVED"
    && registry.activation === "DISABLED_UNTIL_MANDATE"
    && registry.candidateArtifact?.artifactId === command.candidateArtifact.artifactId
    && registry.candidateArtifact?.namespace === command.candidateArtifact.namespace
    && registry.candidateArtifact?.sha256 === command.candidateArtifact.sha256
    && SHA256.test(registry.codeSha256)
    && SHA256.test(registry.dataManifestSha256)
    && SHA256.test(registry.metricsManifestSha256)
    && SHA256.test(registry.validationPlanSha256)
    && typeof registry.approvedBy === "string" && registry.approvedBy.length > 0;
  return exact
    ? { schemaVersion: "v3.2-candidate-mandate-binding-result-v1", status: "EXACT_VERSION_MATCH_READY_FOR_MANDATE_REVIEW", reason: "APPROVED_VERSION_AND_CANDIDATE_ARTIFACT_MATCH", mandateId: command.mandateId, testRunId: command.testRunId, ownerId: command.ownerId, accountId: command.accountId, market: command.market, environmentMode: command.environmentMode, brokerMode: command.brokerMode, versionFingerprint: command.strategyVersion, registryStatus: registry.status, activation: registry.activation, promotionRequestId: registry.promotionRequestId, accountValidation: "NOT_PERFORMED", mandatePersistence: "NOT_PERFORMED" }
    : { schemaVersion: "v3.2-candidate-mandate-binding-result-v1", status: "REJECTED", reason: "REGISTRY_VERSION_OR_CANDIDATE_ARTIFACT_MISMATCH", mandateId: command.mandateId, versionFingerprint: command.strategyVersion };
}
