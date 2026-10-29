import { describe, expect, it } from "vitest";
import { loadV24DailyDirectionFixture } from "../../src/adapters/v24-daily-direction-fixture.js";
import { V24FixtureDailyTargetWorker } from "../../src/application/v24-fixture-daily-target-worker.js";

const scope = { ownerId: "owner", accountId: "account", namespace: "v24-paper-v2-run", testRunId: "run" };

describe("C5 Fixture daily target worker", () => {
  it("materializes an inactive candidate as PAUSED with no order identity", async () => {
    let saved: any;
    const repository = {
      async save(target: any) { saved = target; return { target, created: true }; },
      async find() { return null; },
    };
    const worker = new V24FixtureDailyTargetWorker(repository, async () => ({ cash: { amount: "10000.0000" }, positions: [] }), loadV24DailyDirectionFixture);
    const result = await worker.materialize({ scope, evaluatedAt: "2026-10-16T09:31:00+08:00", mandateStatus: "PENDING" });
    expect(result.created).toBe(true);
    expect(saved).toMatchObject({ dataMode: "FIXTURE", clientOrderId: null, targetQuantity: null, decision: { action: "PAUSED", reason: "MANDATE_INACTIVE" } });
  });

  it("does not infer sellable shares from holdings when availability is unknown", async () => {
    const repository = { async save(target: any) { return { target, created: true }; }, async find() { return null; } };
    const worker = new V24FixtureDailyTargetWorker(repository,
      async () => ({ cash: { amount: "10000.0000" }, positions: [{ security: "600000.SH", quantity: 100 }] }),
      async () => { const fixture = await loadV24DailyDirectionFixture(); return { ...fixture, input: { ...fixture.input, bars: fixture.input.bars.map((bar, index) => ({ ...bar, close: index === 0 ? "10.2500" : "10.0000" })) } }; });
    const result = await worker.materialize({ scope, evaluatedAt: "2026-10-16T09:31:00+08:00", mandateStatus: "ACTIVE" });
    expect(result.target).toMatchObject({ clientOrderId: null, decision: { action: "PAUSED", reason: "SELLABLE_QUANTITY_INSUFFICIENT" } });
  });
});
