import { describe, expect, it } from "vitest";
import { V24ContinuousPaperEngine } from "../../src/application/v24-continuous-paper.js";

describe("V2.4 continuous paper scenarios", () => {
  const engine = new V24ContinuousPaperEngine();
  it("keeps fresh snapshot paper runs safe to HOLD", () => {
    const run = engine.run("normal");
    expect(run.status).toBe("COMPLETED");
    expect(run.brokerMode).toBe("FAKE");
    expect(run.orders[0].status).toBe("HOLD");
  });
  it("rejects stale and duplicate scheduling", () => {
    const run = engine.run("rejection");
    expect(run.status).toBe("COMPLETED");
    expect(run.rejections).toEqual(["STALE_SNAPSHOT", "DUPLICATE_SCHEDULE"]);
  });
  it("records recovery without backfilling missed orders", () => {
    const run = engine.run("recovery");
    expect(run.status).toBe("COMPLETED");
    expect(run.recovery).toMatchObject({ missedWindowOrders: 0, reconciliationBeforeResume: true });
  });
});
