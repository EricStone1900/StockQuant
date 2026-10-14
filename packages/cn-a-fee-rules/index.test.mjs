import assert from "node:assert/strict";
import test from "node:test";
import { calculateCnAEquityFeeCents, isValidCnAEquityFeeSchedule } from "./index.mjs";

const current = {
  scheduleId: "CN_A_CASH_EQUITY_2023_08_28",
  commissionRatePartsPerBillion: 54_100,
  minimumCommissionCents: 5,
};
const historical = {
  scheduleId: "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27",
  commissionRatePartsPerBillion: 68_700,
  minimumCommissionCents: 5,
};

test("current CN_A fees share exact cent rounding for BUY and SELL", () => {
  assert.deepEqual(calculateCnAEquityFeeCents("BUY", 29, 1_006, current), {
    commissionCents: 5, transferFeeCents: 3, stampDutyCents: 0, totalCents: 8,
  });
  assert.deepEqual(calculateCnAEquityFeeCents("SELL", 29, 1_006, current), {
    commissionCents: 5, transferFeeCents: 3, stampDutyCents: 15, totalCents: 23,
  });
});

test("historical CN_A schedule uses its effective stamp-duty rate", () => {
  assert.deepEqual(calculateCnAEquityFeeCents("SELL", 29, 1_006, historical), {
    commissionCents: 5, transferFeeCents: 3, stampDutyCents: 30, totalCents: 38,
  });
});

test("minimum commission, zero quantity, and large notionals remain integer and deterministic", () => {
  const minimum = { ...current, commissionRatePartsPerBillion: 54_100, minimumCommissionCents: 500 };
  assert.deepEqual(calculateCnAEquityFeeCents("BUY", 0, 1_000, minimum), {
    commissionCents: 500, transferFeeCents: 0, stampDutyCents: 0, totalCents: 500,
  });
  const large = calculateCnAEquityFeeCents("SELL", 10_000_000, 123_456, current);
  assert.equal(large.totalCents, large.commissionCents + large.transferFeeCents + large.stampDutyCents);
  assert.ok(Object.values(large).every(Number.isSafeInteger));
});

test("schedule validation rejects unsupported and below-minimum rates", () => {
  assert.equal(isValidCnAEquityFeeSchedule(current), true);
  assert.equal(isValidCnAEquityFeeSchedule({ ...current, commissionRatePartsPerBillion: 54_099 }), false);
  assert.equal(isValidCnAEquityFeeSchedule({ ...historical, commissionRatePartsPerBillion: 68_699 }), false);
  assert.equal(isValidCnAEquityFeeSchedule({ ...current, scheduleId: "UNKNOWN" }), false);
  assert.equal(isValidCnAEquityFeeSchedule({ ...current, minimumCommissionCents: -1 }), false);
});

test("invalid side, negative quantity, nonpositive price, and invalid schedules fail closed", () => {
  assert.throws(() => calculateCnAEquityFeeCents("BUY", -1, 1_000, current), /INVALID_CN_A_FEE_INPUT/u);
  assert.throws(() => calculateCnAEquityFeeCents("BUY", 1, 0, current), /INVALID_CN_A_FEE_INPUT/u);
  assert.throws(() => calculateCnAEquityFeeCents("HOLD", 1, 1_000, current), /INVALID_CN_A_FEE_INPUT/u);
  assert.throws(() => calculateCnAEquityFeeCents("SELL", 1, 1_000, { ...current, commissionRatePartsPerBillion: 1 }), /INVALID_CN_A_FEE_INPUT/u);
});
