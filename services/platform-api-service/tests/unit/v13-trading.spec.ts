import { describe, expect, it } from "vitest";
import { isV13PaperStageRunRequest, V13TradingEngine } from "../../src/application/v13-trading.js";

describe("V1.3 trading acceptance engine", () => {
  const engine = new V13TradingEngine();

  it.each(["normal", "rejection", "recovery"] as const)("keeps %s waiting until real business services provide facts", (scenario) => {
    const run = engine.run(scenario);
    expect(run.status).toBe("WAITING");
    expect(run.assertions.length).toBeGreaterThan(0);
    expect(run.assertions.every((item) => item.status === "WAITING" && item.actual === "NOT_RUN")).toBe(true);
    expect(run.evidence.evidenceScope).toBe("PLATFORM_WAITING_DECLARATION");
    expect(run.evidence.businessExecution).toBe("NOT_RUN");
    expect(run.evidence.businessServicesCalled).toEqual([]);
    expect(run.evidence.orderFacts).toBe("NOT_CREATED");
    expect(run.evidence.fillFacts).toBe("NOT_CREATED");
    expect(run.evidence.portfolioLedgerFacts).toBe("NOT_CREATED");
    expect(run.evidence).not.toHaveProperty("orders");
    expect(run.evidence).not.toHaveProperty("fills");
    expect(run.evidence).not.toHaveProperty("cashAfter");
  });

  it("preserves the named scenario expectations without asserting that they happened", () => {
    const normal = engine.run("normal");
    expect(normal.evidence.scenarioExpectation).toContain("现金8995");
    expect(normal.assertions.every((item) => item.status === "WAITING")).toBe(true);
  });

  it.each([
    [{ scenarioId: "normal", seed: 20260907 }, true],
    [{ scenarioId: "rejection", seed: 0 }, true],
    [{ scenarioId: "recovery", seed: 2147483647 }, true],
    [{ scenarioId: "unknown", seed: 1 }, false],
    [{ scenarioId: "normal", seed: -1 }, false],
    [{ scenarioId: "normal", seed: 2147483648 }, false],
    [{ scenarioId: "normal", seed: 1.5 }, false],
    [{ scenarioId: "normal", seed: 1, liveTradingEnabled: true }, false],
    [null, false],
  ])("validates the frozen V1.3 request contract: %j", (request, expected) => {
    expect(isV13PaperStageRunRequest(request)).toBe(expected);
  });
});
