import { afterEach, describe, expect, it, vi } from "vitest";
import { V24AcceptanceController } from "../../src/bootstrap/app.module.js";

describe("V2.4 observation revision access", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rejects a stale Fixture snapshot before any order, Fill or Outbox can be created", async () => {
    const save = vi.fn(async (value: any) => value);
    const accountId = "22222222-2222-4222-8222-222222222222";
    const controller = new V24AcceptanceController({
      scheduler: {},
      stageRuns: { save, newId: () => "11111111-1111-4111-8111-111111111111" },
      portfolioApiUrl: "http://portfolio.test",
      marketDataUrl: "http://market.test",
      governanceUrl: "http://governance.test",
      executionUrl: "http://execution.test",
      portfolioToken: "p".repeat(40),
      portfolioHeaders: () => ({}),
      marketDataHeaders: () => ({}),
      v24Observation: { listRunRevisions: vi.fn(), listObservationsForOwner: vi.fn() }
    } as any);
    let fixtureTickCalls = 0;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const request = init?.body ? JSON.parse(String(init.body)) as Record<string, any> : {};
      if (url.endsWith("/internal/v1/accounts/initialize")) return new Response(JSON.stringify({ snapshot: { accountId } }), { status: 201 });
      if (url.endsWith("/v2/watchlist/scoped")) return new Response(JSON.stringify({ ...request, securities: ["600000.SH", "000001.SZ", "600519.SH"] }), { status: 200 });
      if (url.endsWith("/v2/sampling/tasks/tick-fixture")) {
        fixtureTickCalls += 1;
        const task = { taskId: "fixture-sampling-task", created: true, status: "COMPLETED_FIXTURE", dataMode: "FIXTURE", fixtureVersion: "v2.1-snapshot-sampling-1", fixtureSha256: "a".repeat(64), scheduledAt: "2026-10-16T01:50:00.000Z", intervalMinutes: 20, securityIds: ["600000.SH"], scope: request.scope, observations: [{ snapshotId: "fixture-stale-snapshot", securityId: "600000.SH", status: "STALE", price: "10.2500", observedAt: "2026-10-16T01:19:00.000Z", ingestedAt: "2026-10-16T01:50:00.000Z" }] };
        return new Response(JSON.stringify({ task: { ...task, created: fixtureTickCalls === 1 }, externalRequests: 0 }), { status: 200 });
      }
      if (url.includes("/v2/sampling/tasks/latest?")) return new Response(JSON.stringify({ task: { taskId: "fixture-sampling-task", status: "COMPLETED_FIXTURE", dataMode: "FIXTURE", fixtureVersion: "v2.1-snapshot-sampling-1", fixtureSha256: "a".repeat(64), scheduledAt: "2026-10-16T01:50:00.000Z", intervalMinutes: 20, securityIds: ["600000.SH"], scope: Object.fromEntries(new URL(url).searchParams), observations: [{ snapshotId: "fixture-stale-snapshot", securityId: "600000.SH", status: "STALE", price: "10.2500", observedAt: "2026-10-16T01:19:00.000Z", ingestedAt: "2026-10-16T01:50:00.000Z" }] } }), { status: 200 });
      if (url.endsWith("/internal/v1/paper-authorizations")) return new Response(JSON.stringify({ error: "snapshot is stale" }), { status: 422 });
      if (url.endsWith(`/internal/v1/accounts/${accountId}/snapshot`)) return new Response(JSON.stringify({ ledgerEntryCount: 1, cash: { amount: "10000.0000" }, positions: [] }), { status: 200 });
      if (url.endsWith("/internal/v1/reconciliation/summary?namespace=v24-paper-v2-11111111-1111-4111-8111-111111111111")) return new Response(JSON.stringify({ order_count: 0, fill_count: 0, pending_outbox_count: 0 }), { status: 200 });
      throw new Error(`unexpected request ${url}`);
    });

    expect(() => controller.preview(undefined, undefined)).toThrow("local session is required");
    await expect(controller.create(undefined, undefined, { scenarioId: "normal" })).rejects.toThrow("local session is required");
    expect(save).not.toHaveBeenCalled();

    const result = await controller.create("sq_session=acceptance-owner-1", undefined, { scenarioId: "rejection" });
    expect(result.status).toBe("COMPLETED");
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0]).toMatchObject({
      status: "COMPLETED",
      evidence: {
        source: { status: "FIXTURE_REJECTED" },
        governance: { status: "REJECTED", httpStatus: 422 },
        orders: [],
        fills: [],
        reconciliation: { order_count: 0, fill_count: 0, pending_outbox_count: 0 },
        assertions: [
          { assertionId: "V2.4-C5-SAMPLING-001", status: "PASS" },
          { assertionId: "V2.4-C5-IDEMPOTENCY-001", status: "PASS" },
          { assertionId: "V2.4-REJECTION-001", status: "PASS" },
          { assertionId: "V2.4-REJECTION-002", status: "PASS" },
          { assertionId: "V2.4-REJECTION-003", status: "PASS" }
        ]
      }
    });
    expect(fetchSpy).toHaveBeenCalledTimes(8);
  });

  it("returns revisions only after owner-scoped TestRun lookup", async () => {
    const revision = {
      revisionId: "1",
      testRunId: "run-1",
      stageId: "V2.4",
      priorStatus: "COMPLETED",
      priorAssertions: [],
      priorEvidence: { observationCounted: true },
      priorCreatedAt: "2026-09-25T00:00:00.000Z",
      priorCompletedAt: "2026-09-25T01:00:00.000Z",
      reason: "OBSERVATION_EVENT_ERRORS",
      recordedAt: "2026-09-25T02:00:00.000Z"
    };
    const find = vi.fn(async () => ({ testRunId: "run-1", stageId: "V2.4", scenarioId: "observation" }));
    const listRunRevisions = vi.fn(async () => [revision]);
    const listObservationsForOwner = vi.fn(async () => []);
    const controller = new V24AcceptanceController({
      scheduler: {},
      stageRuns: { find },
      v24Observation: { listRunRevisions, listObservationsForOwner }
    } as any);

    await expect(controller.revisions("sq_session=acceptance-owner-1", undefined, "run-1")).resolves.toEqual({
      testRunId: "run-1",
      revisions: [revision]
    });
    expect(find).toHaveBeenCalledWith("run-1", "acceptance-owner-1");
    expect(listRunRevisions).toHaveBeenCalledWith("run-1", "acceptance-owner-1");
    await expect(controller.observations("sq_session=acceptance-owner-1", undefined)).resolves.toEqual([]);
    expect(listObservationsForOwner).toHaveBeenCalledWith("acceptance-owner-1");
  });

  it("does not query history for a different user or a non-observation run", async () => {
    const listRunRevisions = vi.fn();
    const find = vi.fn(async () => ({ testRunId: "run-1", stageId: "V2.4", scenarioId: "normal" }));
    const controller = new V24AcceptanceController({
      scheduler: {},
      stageRuns: { find },
      v24Observation: { listRunRevisions, listObservationsForOwner: vi.fn() }
    } as any);

    await expect(controller.revisions("sq_session=another-user", undefined, "run-1")).rejects.toThrow("not authorized");
    expect(find).not.toHaveBeenCalled();

    await expect(controller.revisions("sq_session=acceptance-owner-1", undefined, "run-1")).rejects.toThrow("observation run was not found");
    expect(listRunRevisions).not.toHaveBeenCalled();
    expect(() => controller.observations("sq_session=another-user", undefined)).toThrow("user is not authorized for the local acceptance scope");
    expect(() => controller.observations(undefined, undefined)).toThrow("local session is required");
  });
});
