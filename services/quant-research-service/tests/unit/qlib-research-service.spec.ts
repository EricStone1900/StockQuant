import { describe, expect, it, vi } from "vitest";
import { QlibResearchService } from "../../src/application/qlib-research-service.js";
import { QlibWorkerPortError, type QlibWorkerPort } from "../../src/ports/qlib-worker.js";

const worker = (overrides: Partial<QlibWorkerPort> = {}): QlibWorkerPort => ({
  probe: vi.fn(async () => ({ status: "READY", version: "0.9.7" })),
  fitFixture: vi.fn(async () => ({ status: "PASS" } as never)),
  trainSummary: vi.fn(async () => ({ status: "PASS" })),
  validateSummary: vi.fn(async () => ({ status: "PASS" })),
  ...overrides,
});

describe("QlibResearchService", () => {
  it("keeps an unconfigured Qlib worker explicitly NOT_RUN", async () => {
    const service = new QlibResearchService();

    await expect(service.probe()).resolves.toMatchObject({ status: "NOT_RUN" });
    await expect(service.trainSummary({ bars: [] })).resolves.toMatchObject({
      status: 503,
      body: { status: "NOT_RUN" },
    });
  });

  it("preserves worker rejection status and body", async () => {
    const service = new QlibResearchService(worker({
      trainSummary: vi.fn(async () => { throw new QlibWorkerPortError(422, { error: "fixture rejected" }); }),
    }));

    await expect(service.trainSummary({ bars: [] })).resolves.toEqual({
      status: 422,
      body: { error: "fixture rejected" },
    });
  });

  it("reports fixture-fit timeout as a gateway timeout", async () => {
    const timeout = new Error("aborted");
    timeout.name = "TimeoutError";
    const service = new QlibResearchService(worker({
      fitFixture: vi.fn(async () => { throw timeout; }),
    }));

    await expect(service.fitFixture({} as never)).resolves.toEqual({
      status: 504,
      body: { status: "NOT_RUN", reason: "Qlib fixture fit timed out after 120 seconds" },
    });
  });
});
