import { describe, expect, it, vi } from "vitest";
import { ScenarioRunner } from "../../src/application/scenario-runner.js";
import type { TestRun, TestRunStatus } from "../../src/domain/test-run.js";
import type { TestRunRepository } from "../../src/ports/test-run-repository.js";

describe("V1.1 recovery claim fencing", () => {
  it("lets only one concurrent continuation read and finalize a waiting run", async () => {
    const testRunId = "46fe6cd7-71ca-40ae-9b3a-1440c648c129";
    const accountId = "c9b6866e-45a6-4e42-b2a7-63b2393dad1d";
    const ownerId = "recovery-owner";
    const run: TestRun = {
      testRunId,
      stageId: "V1.1",
      scenarioId: "recovery",
      scenarioVersion: "1.0.0",
      namespace: "v1-1-recovery-concurrent-test",
      ownerId,
      status: "WAITING",
      seed: 20260907,
      accountId,
      createdAt: "2026-10-11T00:00:00.000Z",
      completedAt: null,
      error: null
    };
    let status: TestRunStatus = "WAITING";
    let transitionWinners = 0;
    let assertionWrites = 0;
    let finalStatus: TestRunStatus | undefined;
    const repository: TestRunRepository = {
      async find(id, requestedOwner) {
        return id === testRunId && requestedOwner === ownerId ? { ...run, status } : null;
      },
      async transitionStatus(id, from, to) {
        if (id !== testRunId || status !== from) return false;
        status = to;
        transitionWinners += 1;
        return true;
      },
      async updateStatus(_id, nextStatus) {
        status = nextStatus;
        finalStatus = nextStatus;
      },
      async replaceAssertions(_id, assertions) {
        assertionWrites += 1;
        expect(assertions).toHaveLength(2);
        expect(assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
      }
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      accountId,
      ownerId,
      testRunId,
      namespace: run.namespace,
      cash: { amount: "10000.0000", currency: "CNY" },
      positionCount: 0,
      ledgerEntryCount: 1
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    try {
      const runner = new ScenarioRunner(repository, "http://portfolio.test", "p".repeat(32));
      await Promise.all([
        runner.continueRecovery(testRunId, ownerId),
        runner.continueRecovery(testRunId, ownerId)
      ]);

      expect(transitionWinners).toBe(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(assertionWrites).toBe(1);
      expect(finalStatus).toBe("COMPLETED");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
