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
});
