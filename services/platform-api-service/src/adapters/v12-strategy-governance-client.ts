import type { V12StrategySnapshotCommand } from "../contracts/generated-types.js";
import type { V12StrategyGovernanceClient, V12StrategyGovernanceReceipt } from "../ports/v12-strategy-governance-client.js";

export class HttpV12StrategyGovernanceClient implements V12StrategyGovernanceClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly token: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl) || !/^[A-Za-z0-9_-]{32,}$/u.test(token)) throw new Error("Governance URL and Platform service token are required");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }
  async receiveStrategySnapshot(command: V12StrategySnapshotCommand): Promise<{ status: number; body?: V12StrategyGovernanceReceipt }> {
    const response = await this.request(`${this.baseUrl}/internal/v1/v12/strategy-snapshots`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${this.token}` }, body: JSON.stringify(command), signal: AbortSignal.timeout(5000) });
    const body = await response.json().catch(() => undefined);
    return { status: response.status, body: body as V12StrategyGovernanceReceipt | undefined };
  }
}
