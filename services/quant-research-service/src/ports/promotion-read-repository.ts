import type { V32PromotionRequest } from "../contracts/generated-types.js";

export type RegistryVersionRecord = {
  promotionRequestId: string; versionFingerprint: string; candidateArtifactId: string; candidateNamespace: string;
  candidateSha256: string; codeSha256: string; dataManifestSha256: string; metricsManifestSha256: string;
  validationPlanSha256: string; approvedBy: string; status: "CANDIDATE_APPROVED"; activation: "DISABLED_UNTIL_MANDATE";
};
export type PromotionDetailRecord = {
  promotionRequestId: string; request: V32PromotionRequest; status: string; createdAt: Date;
  decision: string | null; reportFingerprint: string | null; versionFingerprint: string | null; actorId: string | null;
  registryStatus: string | null; activation: string | null;
};
export interface PromotionReadRepository {
  findRegistryVersion(fingerprint: string): Promise<RegistryVersionRecord | null>;
  findPromotionDetail(id: string): Promise<PromotionDetailRecord | null>;
}
