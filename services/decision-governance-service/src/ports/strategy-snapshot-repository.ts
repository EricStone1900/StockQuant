export type StrategySnapshotInput = {
  ownerId: string;
  testRunId: string;
  artifactId: string;
  artifactSha256: string;
  fixtureVersion: string;
  dataVersion: string;
  factorVersion: string;
  strategyId: string;
  strategyHash: string;
  mode: "TOPK" | "NO_TRADE";
  asOf: string;
  targets: Array<{ ticker: string; market: "CN_A" | "US_EQUITY"; currency: "CNY" | "USD"; reason: string }>;
};

export type ReceivedStrategySnapshot = StrategySnapshotInput & {
  snapshotId: string;
  status: "RECEIVED";
  receivedAt: string;
  replayed: boolean;
};

export interface StrategySnapshotRepository {
  receive(input: StrategySnapshotInput): Promise<ReceivedStrategySnapshot>;
  find(ownerId: string, testRunId: string, strategyId: string): Promise<ReceivedStrategySnapshot | null>;
}
