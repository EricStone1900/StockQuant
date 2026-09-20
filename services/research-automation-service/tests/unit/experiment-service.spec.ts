import { describe, expect, it } from "vitest";
import { InMemoryExperimentRepository } from "../../src/adapters/in-memory-experiment-repository.js";
import { ExperimentService } from "../../src/application/experiment-service.js";

const request = { fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1, budgetCents: 100, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: "service-test-1" };

describe("V3.1 preparation service", () => {
  it("does not create a second experiment for the same idempotency key", async () => {
    const service = new ExperimentService(new InMemoryExperimentRepository());
    const first = await service.create(request);
    const second = await service.create(request);
    expect(first.existing).toBe(false);
    expect(second.existing).toBe(true);
    expect(second.experiment.experimentId).toBe(first.experiment.experimentId);
  });

  it("retains a cancelled experiment as recovery evidence", async () => {
    const service = new ExperimentService(new InMemoryExperimentRepository());
    const created = await service.create({ ...request, idempotencyKey: "service-test-2" });
    const cancelled = await service.cancel(created.experiment.experimentId);
    expect(cancelled?.status).toBe("CANCELLED");
    await expect(service.get(created.experiment.experimentId)).resolves.toMatchObject({ status: "CANCELLED" });
  });
});
