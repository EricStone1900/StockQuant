import { GeneratedPlatformV12StrategySnapshotClient } from "../contracts/generated-v12-strategy-snapshot-client.js";
import type { V12StrategySnapshotCommand } from "../contracts/generated-types.js";
import type { V12StrategyGovernanceClient, V12StrategyGovernanceReceipt } from "../ports/v12-strategy-governance-client.js";

export class HttpV12StrategyGovernanceClient implements V12StrategyGovernanceClient {
  private readonly client: GeneratedPlatformV12StrategySnapshotClient;
  constructor(baseUrl: string, private readonly token: string, private readonly request: typeof fetch = fetch) {
    this.client = new GeneratedPlatformV12StrategySnapshotClient(baseUrl, token, request);
  }
  async receiveStrategySnapshot(command: V12StrategySnapshotCommand): Promise<{ status: number; body?: V12StrategyGovernanceReceipt }> {
    const response = await this.client.receiveStrategySnapshot(command);
    return { status: response.status, body: response.body as V12StrategyGovernanceReceipt | undefined };
  }
}
