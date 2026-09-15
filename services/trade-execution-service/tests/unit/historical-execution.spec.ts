import { describe, expect, it } from "vitest";
import { calculateFee, calculateHistoricalExecution, cancelTransition } from "../../src/domain/historical-execution.js";
describe("historical FakeBroker execution", () => {
  it("uses next bar open and participation cap without floating-point money", () => {
    const result = calculateHistoricalExecution({ namespace:"n", accountId:"a", clientOrderId:"o", security:"600000.SH", requestedQuantity:100, bar:{ timestamp:"2024-01-03T01:30:00.000Z", open:"10.2000", volume:500 } }, { orderId:"o", externalFillId:"f" });
    expect(result).toMatchObject({ status:"PARTIALLY_FILLED", fill:{ quantity:50, price:"10.2102", fee:"0.5105" } });
  });
  it("rejects zero-volume bars", () => expect(calculateHistoricalExecution({ namespace:"n", accountId:"a", clientOrderId:"o", security:"600000.SH", requestedQuantity:100, bar:{ timestamp:"2024-01-03T01:30:00.000Z", open:"10.2000", volume:0 } }, { orderId:"o", externalFillId:"f" }).rejectionReason).toBe("ZERO_VOLUME"));
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
});
