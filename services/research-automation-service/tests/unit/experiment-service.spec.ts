import { describe, expect, it } from "vitest";
import { InMemoryExperimentRepository } from "../../src/adapters/in-memory-experiment-repository.js";
import { ExperimentService } from "../../src/application/experiment-service.js";

const request = { fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1, budgetCurrency: "USD", budgetCents: 300, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: "service-test-1" };
const fixedClock = { now: () => new Date("2026-10-03T00:00:00.000Z") };

describe("V3.1 preparation service", () => {
  it("does not create a second experiment for the same idempotency key", async () => {
    const service = new ExperimentService(new InMemoryExperimentRepository(), fixedClock);
    const first = await service.create(request);
    const second = await service.create(request);
    expect(first.existing).toBe(false);
    expect(second.existing).toBe(true);
    expect(second.experiment.experimentId).toBe(first.experiment.experimentId);
  });

  it("retains a cancelled experiment as recovery evidence", async () => {
    const service = new ExperimentService(new InMemoryExperimentRepository(), fixedClock);
    const created = await service.create({ ...request, idempotencyKey: "service-test-2" });
    const cancelled = await service.cancel(created.experiment.experimentId);
    expect(cancelled?.status).toBe("CANCELLED");
    await expect(service.get(created.experiment.experimentId)).resolves.toMatchObject({ status: "CANCELLED" });
  });

  it("uses the injected business clock for experiment creation and cancellation", async () => {
    let current = new Date("2026-10-03T01:00:00.000Z");
    const service = new ExperimentService(new InMemoryExperimentRepository(), { now: () => new Date(current) });
    const created = await service.create({ ...request, idempotencyKey: "service-test-clock" });
    expect(created.experiment.createdAt).toBe("2026-10-03T01:00:00.000Z");

    current = new Date("2026-10-03T01:05:00.000Z");
    const cancelled = await service.cancel(created.experiment.experimentId);
    expect(cancelled?.cancelledAt).toBe("2026-10-03T01:05:00.000Z");
  });

  it("settles unused reserved budget at zero when a pending experiment is cancelled", async () => {
    const settlements: Array<[string, number | "UNKNOWN"]> = [];
    let reservationStatus = "RESERVED";
    const service = new ExperimentService(new InMemoryExperimentRepository(), fixedClock, 1000, {
      reserve: () => ({ status: reservationStatus }),
      get: () => ({ status: reservationStatus }),
      settle: (id, amount) => { settlements.push([id, amount]); reservationStatus = "SETTLED"; return { status: "SETTLED", spentCents: amount }; },
    });
    const created = await service.create({ ...request, idempotencyKey: "service-test-budget-cancel" });
    await service.cancel(created.experiment.experimentId);
    await service.cancel(created.experiment.experimentId);
    expect(settlements).toEqual([[created.experiment.experimentId, 0]]);
  });

  it("retains UNKNOWN budget when cancelling because possible charges need reconciliation", async () => {
    let settled = false;
    const service = new ExperimentService(new InMemoryExperimentRepository(), fixedClock, 1000, {
      reserve: () => ({ status: "RESERVED" }),
      get: () => ({ status: "UNKNOWN" }),
      settle: () => { settled = true; },
    });
    const created = await service.create({ ...request, idempotencyKey: "service-test-unknown-cancel" });
    await service.cancel(created.experiment.experimentId);
    expect(settled).toBe(false);
  });

  it("rejects reusing an idempotency key with different inputs", async () => {
    const service = new ExperimentService(new InMemoryExperimentRepository(), fixedClock);
    await service.create({ ...request, idempotencyKey: "service-test-conflict" });
    await expect(service.create({ ...request, budgetCents: 301, idempotencyKey: "service-test-conflict" })).rejects.toThrow("idempotency key was reused");
  });

  it("binds idempotent experiments to the exact TestRun", async () => {
    const service = new ExperimentService(new InMemoryExperimentRepository(), fixedClock);
    const testRunId = "8e5b0ab2-1835-4ed7-9e11-08754cdd4bf1";
    const input = { ...request, testRunId, idempotencyKey: "service-test-run-binding" };
    const created = await service.create(input);
    expect(created.experiment.testRunId).toBe(testRunId);
    await expect(service.create({ ...input, testRunId: "1f37d165-2721-45c1-8df3-f8493f6a5e1d" })).rejects.toThrow("idempotency key was reused");
  });

  it("rejects malformed TestRun identifiers", async () => {
    const service = new ExperimentService(new InMemoryExperimentRepository(), fixedClock);
    await expect(service.create({ ...request, testRunId: "run-1" })).rejects.toThrow("testRunId must be a UUID");
  });
});
