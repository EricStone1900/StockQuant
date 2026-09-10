export type Market = "CN_A" | "US_EQUITY";
export type SimulationMode = "PAPER" | "BACKTEST";

export interface Money {
  amount: string;
  currency: string;
}

export interface InitializeAccountCommand {
  fixtureAccountRef: string;
  ownerId: string;
  market: Market;
  environmentMode: SimulationMode;
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
  environmentMode: SimulationMode;
  brokerMode: "FAKE";
  cash: Money;
  positionCount: number;
  ledgerEntryCount: number;
  ledgerVersion: number;
}

/** A broker-confirmed fill.  Only a trusted internal execution service may post it. */
export interface RecordFillCommand {
  accountId: string;
  namespace: string;
  externalFillId: string;
  security: string;
  quantity: number;
  price: string;
  fee: string;
  currency: string;
  effectiveAt: string;
}
