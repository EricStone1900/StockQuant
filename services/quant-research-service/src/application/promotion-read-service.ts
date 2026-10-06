import type { PromotionReadRepository } from "../ports/promotion-read-repository.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;
export class PromotionReadService {
  constructor(private readonly repository: PromotionReadRepository) {}

  async registryVersion(fingerprint: string): Promise<{ status: number; body: unknown }> {
    if (!SHA256.test(fingerprint)) return { status: 422, body: { status: "REJECTED", reason: "versionFingerprint must be a SHA-256" } };
    const row = await this.repository.findRegistryVersion(fingerprint.toLowerCase());
    if (!row) return { status: 404, body: { status: "NOT_FOUND", reason: "approved Registry version not found" } };
    return { status: 200, body: { schemaVersion: "v3.2-promotion-registry-version-v1", promotionRequestId: row.promotionRequestId, versionFingerprint: row.versionFingerprint, candidateArtifact: { artifactId: row.candidateArtifactId, namespace: row.candidateNamespace, sha256: row.candidateSha256 }, codeSha256: row.codeSha256, dataManifestSha256: row.dataManifestSha256, metricsManifestSha256: row.metricsManifestSha256, validationPlanSha256: row.validationPlanSha256, approvedBy: row.approvedBy, status: row.status, activation: row.activation } };
  }

  async detail(id: string): Promise<{ status: number; body: unknown }> {
    if (!UUID.test(id)) return { status: 422, body: { status: "REJECTED", reason: "promotionRequestId must be a UUID" } };
    const row = await this.repository.findPromotionDetail(id);
    if (!row) return { status: 404, body: { status: "NOT_FOUND" } };
    const decision = row.decision ? { decision: row.decision, reportFingerprint: row.reportFingerprint, versionFingerprint: row.versionFingerprint, actorId: row.actorId, registryStatus: row.registryStatus ?? "NOT_REGISTERED", activation: row.activation ?? "DISABLED_UNTIL_MANDATE" } : null;
    return { status: 200, body: { schemaVersion: "v3.2-promotion-request-detail-v1", promotionRequestId: row.promotionRequestId, request: row.request, status: row.status, createdAt: row.createdAt.toISOString(), decision } };
  }
}
