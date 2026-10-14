const RATE_DENOMINATOR = 1_000_000_000n;
const CURRENT_COMMISSION_MIN_RATE = 54_100;
const HISTORICAL_COMMISSION_MIN_RATE = 68_700;
const MAX_COMMISSION_RATE = 3_000_000;
const TRANSFER_FEE_RATE = 100_000n;
const CURRENT_SELL_STAMP_DUTY_RATE = 500_000n;
const HISTORICAL_SELL_STAMP_DUTY_RATE = 1_000_000n;

export function isValidCnAEquityFeeSchedule(schedule) {
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) return false;
  const historical = schedule.scheduleId === "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27";
  const current = schedule.scheduleId === "CN_A_CASH_EQUITY_2023_08_28";
  if (!historical && !current) return false;
  const minimumRate = historical ? HISTORICAL_COMMISSION_MIN_RATE : CURRENT_COMMISSION_MIN_RATE;
  return Number.isSafeInteger(schedule.commissionRatePartsPerBillion)
    && schedule.commissionRatePartsPerBillion >= minimumRate
    && schedule.commissionRatePartsPerBillion <= MAX_COMMISSION_RATE
    && Number.isSafeInteger(schedule.minimumCommissionCents)
    && schedule.minimumCommissionCents >= 0;
}

function ceilRate(notionalCents, ratePartsPerBillion) {
  return (notionalCents * ratePartsPerBillion + RATE_DENOMINATOR - 1n) / RATE_DENOMINATOR;
}

function toSafeNumber(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error(`${label} exceeds safe integer cents`);
  return number;
}

export function calculateCnAEquityFeeCents(side, quantity, priceCents, schedule) {
  if ((side !== "BUY" && side !== "SELL")
      || !Number.isSafeInteger(quantity) || quantity < 0
      || !Number.isSafeInteger(priceCents) || priceCents <= 0
      || !isValidCnAEquityFeeSchedule(schedule)) {
    throw new Error("INVALID_CN_A_FEE_INPUT");
  }
  const notionalCents = BigInt(quantity) * BigInt(priceCents);
  const commissionCents = [
    BigInt(schedule.minimumCommissionCents),
    ceilRate(notionalCents, BigInt(schedule.commissionRatePartsPerBillion)),
  ].reduce((maximum, fee) => fee > maximum ? fee : maximum);
  const transferFeeCents = ceilRate(notionalCents, TRANSFER_FEE_RATE);
  const stampDutyRate = schedule.scheduleId === "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27"
    ? HISTORICAL_SELL_STAMP_DUTY_RATE
    : CURRENT_SELL_STAMP_DUTY_RATE;
  const stampDutyCents = side === "SELL" ? ceilRate(notionalCents, stampDutyRate) : 0n;
  return {
    commissionCents: toSafeNumber(commissionCents, "commission fee"),
    transferFeeCents: toSafeNumber(transferFeeCents, "transfer fee"),
    stampDutyCents: toSafeNumber(stampDutyCents, "stamp duty"),
    totalCents: toSafeNumber(commissionCents + transferFeeCents + stampDutyCents, "total fee"),
  };
}
