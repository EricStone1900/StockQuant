export type CnAEquityFeeScheduleId =
  | "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27"
  | "CN_A_CASH_EQUITY_2023_08_28";

export type CnAEquityFeeSchedule = {
  scheduleId: CnAEquityFeeScheduleId;
  commissionRatePartsPerBillion: number;
  minimumCommissionCents: number;
};

export type CnAEquityFeeBreakdown = {
  commissionCents: number;
  transferFeeCents: number;
  stampDutyCents: number;
  totalCents: number;
};

export declare function isValidCnAEquityFeeSchedule(schedule: CnAEquityFeeSchedule): boolean;

/** Calculates the frozen CN_A Fixture fee rules using integer cents and ceiling rate rounding. */
export declare function calculateCnAEquityFeeCents(
  side: "BUY" | "SELL",
  quantity: number,
  priceCents: number,
  schedule: CnAEquityFeeSchedule,
): CnAEquityFeeBreakdown;
