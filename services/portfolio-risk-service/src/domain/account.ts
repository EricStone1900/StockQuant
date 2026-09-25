import type { AccountSnapshot as ContractAccountSnapshot, InitializeAccountCommand as ContractInitializeAccountCommand, Money as ContractMoney, Security as ContractSecurity } from "../contracts/generated-types.js";

export type Market = ContractSecurity["market"];
export type SimulationMode = "PAPER" | "BACKTEST";

export type Money = ContractMoney;

export type InitializeAccountCommand = ContractInitializeAccountCommand;

export type AccountSnapshot = ContractAccountSnapshot;

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
