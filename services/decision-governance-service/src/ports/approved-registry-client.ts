export interface ApprovedRegistryClient {
  getApprovedPromotionRegistryVersion(versionFingerprint: string): Promise<{ status: number; body?: unknown }>;
}
