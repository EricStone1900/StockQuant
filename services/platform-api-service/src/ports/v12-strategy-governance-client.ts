import type { V12StrategySnapshotCommand } from "../contracts/generated-types.js";

export type V12StrategyGovernanceReceipt = { snapshotId: string; status: "RECEIVED"; replayed: boolean };
export interface V12StrategyGovernanceClient {
  receiveStrategySnapshot(command: V12StrategySnapshotCommand): Promise<{ status: number; body?: V12StrategyGovernanceReceipt }>;
}
