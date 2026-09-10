import { describe, expect, it } from "vitest";
import { checkpointForBars, checkpointForExecution } from "../../src/domain/checkpoint.js";
describe("replay checkpoint", () => {
  it("captures only deterministic resumption inputs", () => expect(checkpointForExecution("2024-01-03T09:31:00+08:00", 20260907)).toEqual({ cursor:3, virtualTime:"2024-01-03T09:31:00+08:00", pendingOrderId:"v2.3-order-1", seed:20260907 }));
  it("rejects an invalid business timestamp", () => expect(() => checkpointForExecution("not-a-time", 1)).toThrow("ISO timestamp"));
  it("advances a serializable multi-bar cursor", () => expect(checkpointForBars([{ timestamp:"2024-01-02T09:31:00+08:00" }, { timestamp:"2024-01-03T09:31:00+08:00" }], 7, 1, ["v2.3-order-1"])).toEqual({ cursor:1, virtualTime:"2024-01-02T09:31:00+08:00", pendingOrderId:"v2.3-order-2", seed:7, totalBars:2, completedOrderIds:["v2.3-order-1"] }));
});
