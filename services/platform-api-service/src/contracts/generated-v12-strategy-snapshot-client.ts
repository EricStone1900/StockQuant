// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/decision-governance-v12-strategy-snapshots.v1.json
import type * as Contracts from "./generated-types.js";

export type V12StrategySnapshotResponse<T = unknown> = { status: number; body?: T | Record<string, unknown> };

export class GeneratedPlatformV12StrategySnapshotClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }
  async receiveStrategySnapshot(command: Contracts.V12StrategySnapshotCommand, timeoutMs = 5000): Promise<V12StrategySnapshotResponse> {
    const response = await this.request(this.baseUrl + "/internal/v1/v12/strategy-snapshots", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(command), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string,unknown> | undefined };
  }
}
