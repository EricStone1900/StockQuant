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
});
