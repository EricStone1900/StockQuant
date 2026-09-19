import { describe, expect, it } from "vitest";
import { assertCausalBarrier, assertEventOrder, eventsForExecution } from "../../src/domain/events.js";

describe("replay event ordering", () => {
  it("emits the causal barrier sequence after a fill", () => {
    const events = eventsForExecution("PARTIALLY_FILLED");
    expect(events).toEqual(["BAR_CLOSE", "DECISION", "ORDER_ACCEPTED", "FILL", "LEDGER_COMMITTED"]);
    expect(() => assertEventOrder(events)).not.toThrow();
    expect(() => assertCausalBarrier(events)).not.toThrow();
  });

  it("does not invent fill or ledger events for rejection", () => {
    expect(eventsForExecution("REJECTED")).toEqual(["BAR_CLOSE", "DECISION", "ORDER_REJECTED"]);
    expect(() => assertCausalBarrier(eventsForExecution("REJECTED"))).not.toThrow();
  });

  it("rejects a partial causal sequence before checkpointing", () => {
    expect(() => assertCausalBarrier(["BAR_CLOSE", "DECISION", "ORDER_ACCEPTED", "FILL"])).toThrow("causal barrier is incomplete");
  });
});
