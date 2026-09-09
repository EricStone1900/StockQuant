import { describe, expect, it } from "vitest";
import { V13TradingEngine } from "../../src/application/v13-trading.js";

describe("V1.3 trading acceptance engine", () => {
  const engine = new V13TradingEngine();
  it("books a full fill exactly once", () => {
    const run = engine.run("normal");
    expect(run.status).toBe("COMPLETED");
    expect(run.evidence.cashAfter).toBe(8995);
    expect(run.evidence.positionAfter).toBe(100);
  });
  it("rejects governance and risk violations before broker place", () => {
    const run = engine.run("rejection");
    expect(run.status).toBe("COMPLETED");
    expect(run.evidence.brokerPlaceCalls).toBe(0);
  });
  it("recovers UNKNOWN without a second place and deduplicates fills", () => {
    const run = engine.run("recovery");
    expect(run.status).toBe("COMPLETED");
    expect((run.evidence.order as { placeCalls: number }).placeCalls).toBe(1);
    expect((run.evidence.ledger as { uniqueFillsBooked: number }).uniqueFillsBooked).toBe(1);
  });
});
