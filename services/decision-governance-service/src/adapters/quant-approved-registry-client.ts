import { GeneratedQuantRegistryClient } from "../contracts/generated-quant-registry-client.js";
import type { ApprovedRegistryClient } from "../ports/approved-registry-client.js";

export class QuantApprovedRegistryAdapter implements ApprovedRegistryClient {
  private readonly client: GeneratedQuantRegistryClient;
  constructor(baseUrl: string, bearerToken: string) { this.client = new GeneratedQuantRegistryClient(baseUrl, bearerToken); }
  getApprovedPromotionRegistryVersion(versionFingerprint: string) { return this.client.getApprovedPromotionRegistryVersion(versionFingerprint); }
}
