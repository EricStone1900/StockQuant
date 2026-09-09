export type Market = "CN_A" | "US_EQUITY";

export interface Money {
  amount: string;
  currency: string;
}

export interface InitializeAccountCommand {
  fixtureAccountRef: string;
  ownerId: string;
  market: Market;
  environmentMode: "PAPER";
  brokerMode: "FAKE";
  initialCash: Money;
  namespace: string;
  testRunId: string;
  idempotencyKey: string;
}

export interface AccountSnapshot {
  accountId: string;
  namespace: string;
  testRunId: string;
  ownerId: string;
  fixtureAccountRef: string;
  market: Market;
  environmentMode: "PAPER";
  brokerMode: "FAKE";
  cash: Money;
  positionCount: number;
  ledgerEntryCount: number;
  ledgerVersion: number;
}
