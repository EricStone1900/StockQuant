import type { AccountSnapshot as ContractAccountSnapshot, FillFeeCorrectionCommand as ContractFillFeeCorrectionCommand, InitializeAccountCommand as ContractInitializeAccountCommand, Money as ContractMoney, ReservedFillCommand as ContractReservedFillCommand, Security as ContractSecurity } from "../contracts/generated-types.js";

export type Market = ContractSecurity["market"];
export type SimulationMode = "PAPER" | "BACKTEST";

export type Money = ContractMoney;

export type InitializeAccountCommand = ContractInitializeAccountCommand;

export type AccountSnapshot = ContractAccountSnapshot;

/** A broker-confirmed fill.  Only a trusted internal execution service may post it. */
export type RecordFillCommand = ContractReservedFillCommand & { accountId: string };

export type CorrectFillFeeCommand = ContractFillFeeCorrectionCommand & { accountId: string; externalFillId: string };


export type ResourceReservation = {
  reservationId: string;
  accountId: string;
  namespace: string;
  testRunId: string;
  ownerId: string;
  idempotencyKey: string;
  clientOrderId: string;
  side: "BUY" | "SELL";
  currency: string;
  cashAmount: string | null;
  security: string | null;
  quantity: number | null;
  capturedCashAmount: string;
  capturedQuantity: number;
  status: "HELD" | "UNKNOWN" | "CAPTURED" | "RELEASED";
  evidenceRef: string | null;
};

export type ReserveResourceCommand = Omit<ResourceReservation, "reservationId" | "status" | "evidenceRef">;
