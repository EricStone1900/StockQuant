import { describe, expect, it } from "vitest";
import { calculateFee, calculateHistoricalExecution, cancelTransition, historicalExecutionFingerprint, validateExecutionReservation } from "../../src/domain/historical-execution.js";
describe("historical FakeBroker execution", () => {
  it("uses next bar open and participation cap without floating-point money", () => {
    const result = calculateHistoricalExecution({ namespace:"n", accountId:"a", clientOrderId:"o", security:"600000.SH", requestedQuantity:100, bar:{ timestamp:"2024-01-03T01:30:00.000Z", open:"10.2000", volume:500 } }, { orderId:"o", externalFillId:"f" });
    expect(result).toMatchObject({ status:"PARTIALLY_FILLED", fill:{ quantity:50, price:"10.2200", fee:"0.5110" } });
  });
  it("rejects zero-volume bars", () => expect(calculateHistoricalExecution({ namespace:"n", accountId:"a", clientOrderId:"o", security:"600000.SH", requestedQuantity:100, bar:{ timestamp:"2024-01-03T01:30:00.000Z", open:"10.2000", volume:0 } }, { orderId:"o", externalFillId:"f" }).rejectionReason).toBe("ZERO_VOLUME"));
  it("applies complete market restriction bars to Paper execution and binds them to idempotency", () => {
    const base = { namespace:"n", accountId:"a", clientOrderId:"restriction", security:"600000.SH", requestedQuantity:100, bar:{ timestamp:"2024-02-01T01:30:00.000Z", open:"10.0000", high:"10.0000", low:"10.0000", close:"10.0000", volume:0, tradingStatus:"SUSPENDED" as const, upperLimit:"11.0000", lowerLimit:"9.0000" } };
    expect(calculateHistoricalExecution(base, { orderId:"s", externalFillId:"f" })).toMatchObject({ status:"REJECTED", rejectionReason:"SUSPENDED" });
    const upper = { ...base, bar:{ ...base.bar, timestamp:"2024-02-02T01:30:00.000Z", open:"11.0000", high:"11.0000", low:"11.0000", close:"11.0000", volume:500, tradingStatus:"TRADED" as const } };
    expect(calculateHistoricalExecution(upper, { orderId:"u", externalFillId:"f" })).toMatchObject({ status:"REJECTED", rejectionReason:"LOCKED_AT_UPPER_LIMIT" });
    const lower = { ...upper, side:"SELL" as const, bar:{ ...upper.bar, timestamp:"2024-02-05T01:30:00.000Z", open:"9.0000", high:"9.0000", low:"9.0000", close:"9.0000" } };
    expect(calculateHistoricalExecution(lower, { orderId:"l", externalFillId:"f" })).toMatchObject({ status:"REJECTED", rejectionReason:"LOCKED_AT_LOWER_LIMIT" });
    const open = { ...upper, bar:{ ...upper.bar, timestamp:"2024-02-06T01:30:00.000Z", open:"10.0000", high:"10.2000", low:"9.9000", close:"10.1000" } };
    expect(calculateHistoricalExecution(open, { orderId:"o", externalFillId:"f" }).fill).toBeDefined();
    expect(historicalExecutionFingerprint(open)).not.toBe(historicalExecutionFingerprint({ ...open, bar:{ ...open.bar, upperLimit:"10.5000" } }));
    expect(calculateHistoricalExecution({ ...open, bar:{ ...open.bar, high:undefined } }, { orderId:"bad", externalFillId:"f" }).rejectionReason).toBe("INVALID_BAR");
  });
  it("requests cancellation before reaching a cancellation fact", () => {
    expect(cancelTransition("PARTIALLY_FILLED")).toBe("CANCEL_REQUESTED");
    expect(cancelTransition("CANCEL_REQUESTED")).toBe("CANCELLED");
    expect(cancelTransition("FILLED")).toBe("FILLED");
  });
  it("rounds the versioned 10 bps fee in decimal space", () => expect(calculateFee("10.2102", 50)).toBe("0.5105"));
  it("keeps UNKNOWN distinct from terminal failure", () => expect(cancelTransition("UNKNOWN")).toBe("CANCEL_REQUESTED"));
  it("applies explicit participation, slippage and sell-side direction", () => {
    const result = calculateHistoricalExecution({ namespace:"n", accountId:"a", clientOrderId:"o2", security:"600000.SH", requestedQuantity:100, side:"SELL", participationRate:0.25, slippageBps:20, bar:{ timestamp:"2024-01-03T01:30:00.000Z", open:"10.0000", volume:400 } }, { orderId:"o2", externalFillId:"f2" });
    expect(result).toMatchObject({ status:"FILLED", fill:{ quantity:100, price:"9.9800" } });
  });
  it("expires a DAY limit order that is not marketable on the next bar", () => {
    const result = calculateHistoricalExecution({ namespace:"n", accountId:"a", clientOrderId:"o3", security:"600000.SH", requestedQuantity:10, orderType:"LIMIT", timeInForce:"DAY", limitPrice:"10.0000", bar:{ timestamp:"2024-01-03T01:30:00.000Z", open:"10.1000", volume:100 } }, { orderId:"o3", externalFillId:"f3" });
    expect(result).toMatchObject({ status:"EXPIRED", rejectionReason:"LIMIT_NOT_MARKETABLE" });
  });
  it("rejects invalid execution rules", () => {
    const result = calculateHistoricalExecution({ namespace:"n", accountId:"a", clientOrderId:"o4", security:"600000.SH", requestedQuantity:10, participationRate:2, bar:{ timestamp:"2024-01-03T01:30:00.000Z", open:"10.1000", volume:100 } }, { orderId:"o4", externalFillId:"f4" });
    expect(result.rejectionReason).toBe("INVALID_RULE");
  });
  it("uses the versioned CN_A fee schedule and fails closed outside its currency, security or effective dates", () => {
    const base = { namespace:"n", accountId:"a", clientOrderId:"fee-v1", security:"600000.SH", requestedQuantity:29, side:"BUY" as const, currency:"CNY", participationRate:0.29, slippageBps:55, bar:{ timestamp:"2024-01-03T01:30:00.000Z", open:"10.0000", volume:100 } };
    const marketFeeSchedule = { scheduleId:"CN_A_CASH_EQUITY_2023_08_28" as const, commissionRatePartsPerBillion:54_100, minimumCommissionCents:5 };
    expect(calculateHistoricalExecution({ ...base, marketFeeSchedule }, { orderId:"o-fee", externalFillId:"f-fee" }).fill).toMatchObject({ quantity:29, price:"10.0600", fee:"0.0800" });
    expect(calculateHistoricalExecution({ ...base, currency:"USD", marketFeeSchedule }, { orderId:"o-currency", externalFillId:"f-currency" }).rejectionReason).toBe("INVALID_RULE");
    expect(calculateHistoricalExecution({ ...base, security:"AAPL", marketFeeSchedule }, { orderId:"o-market", externalFillId:"f-market" }).rejectionReason).toBe("INVALID_RULE");
    expect(calculateHistoricalExecution({ ...base, bar:{ ...base.bar, timestamp:"2023-08-27T01:30:00.000Z" }, marketFeeSchedule }, { orderId:"o-date", externalFillId:"f-date" }).rejectionReason).toBe("INVALID_RULE");
    expect(calculateHistoricalExecution({ ...base, bar:{ ...base.bar, timestamp:"not-a-timestamp" }, marketFeeSchedule }, { orderId:"o-time", externalFillId:"f-time" }).rejectionReason).toBe("INVALID_RULE");
    expect(calculateHistoricalExecution({ ...base, marketFeeSchedule:{ ...marketFeeSchedule, commissionRatePartsPerBillion:0 } }, { orderId:"o-rate", externalFillId:"f-rate" }).rejectionReason).toBe("INVALID_RULE");
  });
  it("uses a stable semantic fingerprint and distinguishes changed idempotent requests", () => {
    const command = { namespace:"n", accountId:"a", clientOrderId:"o5", security:"600000.SH", requestedQuantity:100, bar:{ timestamp:"2024-01-03T01:30:00.000Z", open:"10.2000", volume:500 } };
    expect(historicalExecutionFingerprint(command)).toBe(historicalExecutionFingerprint({ ...command, side:"BUY", orderType:"MARKET", timeInForce:"DAY", participationRate:0.1, slippageBps:10 }));
    expect(historicalExecutionFingerprint(command)).not.toBe(historicalExecutionFingerprint({ ...command, requestedQuantity:99 }));
    expect(historicalExecutionFingerprint(command)).not.toBe(historicalExecutionFingerprint({ ...command, bar:{ ...command.bar, open:"10.2100" } }));
  });
  it("binds reservation identity and side/currency to the idempotent request", () => {
    const command = { namespace:"n", accountId:"a", clientOrderId:"o6", security:"600000.SH", requestedQuantity:100, initialAccountCash:"10000.0000", side:"SELL" as const, currency:"CNY", reservation:{ reservationId:"r", ownerId:"owner", testRunId:"run", clientOrderId:"o6" }, bar:{ timestamp:"2024-01-03T01:30:00.000Z", open:"10.2000", volume:500 } };
    expect(() => validateExecutionReservation(command)).not.toThrow();
    expect(historicalExecutionFingerprint(command)).not.toBe(historicalExecutionFingerprint({ ...command, reservation:undefined }));
    expect(historicalExecutionFingerprint(command)).not.toBe(historicalExecutionFingerprint({ ...command, side:"BUY" }));
    expect(historicalExecutionFingerprint(command)).not.toBe(historicalExecutionFingerprint({ ...command, initialAccountCash:"9999.0000" }));
    expect(() => validateExecutionReservation({ ...command, initialAccountCash:undefined })).toThrow("INITIAL_ASSET_CASH_REQUIRED");
    expect(() => validateExecutionReservation({ ...command, initialAccountCash:"NaN" })).toThrow("INVALID_INITIAL_ACCOUNT_CASH");
    expect(() => validateExecutionReservation({ ...command, reservation:{ ...command.reservation, clientOrderId:"other-order" } })).toThrow("RESERVATION_ORDER_MISMATCH");
    expect(() => validateExecutionReservation({ ...command, currency:"CNY;DROP" })).toThrow("INVALID_CURRENCY");
  });
});
