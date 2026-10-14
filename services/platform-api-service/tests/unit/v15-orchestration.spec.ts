import { describe, expect, it } from "vitest";
import { V15OrchestrationEngine } from "../../src/application/v15-orchestration.js";
import { loadV15NoTradeCalendar } from "../../src/application/v15-no-trade-calendar.js";
import { completeV15NoTrade, prepareV15NoTrade, verifyV15NoTradeSession, type V15Account, type V15NoTradeInput } from "../../src/application/v15-no-trade.js";

describe("V1.5 orchestration readiness boundary", () => {
  const engine = new V15OrchestrationEngine();

  it.each(["normal", "rejection", "recovery"] as const)("keeps %s business claims unrun until real workflows are connected", (scenarioId) => {
    const run = engine.run(scenarioId);

    expect(run.status).toBe("WAITING");
    expect(run.assertions.length).toBeGreaterThan(0);
    expect(run.assertions.every((assertion) => assertion.status === "WAITING" && assertion.actual === "NOT_RUN")).toBe(true);
    expect(run.evidence.businessExecution).toBe("NOT_RUN");
    expect(run.evidence.businessServicesCalled).toEqual([]);
    expect(run.evidence.workflow).toBe("NOT_CONNECTED");
    expect(run.evidence.orders).toBe("NOT_CREATED");
    expect(run.evidence.fills).toBe("NOT_CREATED");
    expect(run.evidence.portfolioLedgerFacts).toBe("NOT_CREATED");
    expect(run.evidence.backupRestore).toBe("NOT_RUN");
  });
});

describe("V1.5 Temporal NO_TRADE domain activities", () => {
  const calendar = loadV15NoTradeCalendar();
  const input: V15NoTradeInput = { testRunId: "60cbf540-c418-4d66-a279-25bd4e35fab2", ownerId: "owner-1", namespace: "v1-5-normal-60cbf540-c418-4d66-a279-25bd4e35fab2", scenarioId: "normal", seed: 20260907, ...calendar };
  const accounts: Record<"CN_A" | "US_EQUITY", V15Account> = {
    CN_A: { accountId: "account-cn", ownerId: input.ownerId, testRunId: input.testRunId, namespace: input.namespace, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.00", currency: "CNY" }, positions: [], ledgerEntryCount: 1, ledgerVersion: 1, reservations: [] },
    US_EQUITY: { accountId: "account-us", ownerId: input.ownerId, testRunId: input.testRunId, namespace: input.namespace, market: "US_EQUITY", environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.00", currency: "USD" }, positions: [], ledgerEntryCount: 1, ledgerVersion: 1, reservations: [] },
  };

  it("loads 60 frozen ordered sessions per market and verifies their manifest hash", () => {
    expect(input.fixtureSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(input.sessions).toHaveLength(120);
    expect(input.sessions.filter((session) => session.market === "CN_A")).toHaveLength(60);
    expect(input.sessions.filter((session) => session.market === "US_EQUITY")).toHaveLength(60);
  });

  it("proves each virtual session from the matching authoritative account and FakeBroker reads", async () => {
    const prepared = await prepareV15NoTrade(input, { initializeAccount: async ({ market }) => accounts[market] });
    const observations = [];
    for (const session of input.sessions) {
      observations.push(await verifyV15NoTradeSession(input, session, prepared[session.market], {
        readAccount: async (accountId) => Object.values(accounts).find((account) => account.accountId === accountId)!,
        readBrokerSummary: async (namespace) => ({ namespace, brokerMode: "FAKE", order_count: 0, fill_count: 0, unresolved_order_count: 0, pending_outbox_count: 0, externalOnlyOrderCount: 0 }),
      }));
    }
    let saved: unknown;
    const result = await completeV15NoTrade(input, prepared, observations, { saveRun: async (run) => { saved = run; return run as never; } });
    expect(result.status).toBe("WAITING");
    expect((saved as { assertions: Array<{ assertionId: string; status: string }> }).assertions).toEqual([
      expect.objectContaining({ assertionId: "V1.5-SYS-SCHEDULE-001", status: "WAITING" }),
      expect.objectContaining({ assertionId: "V1.5-HOLD-002", status: "PASS" }),
    ]);
    expect((saved as { evidence: Record<string, unknown> }).evidence).toMatchObject({ environmentMode: "PAPER", dataMode: "FIXTURE", brokerMode: "FAKE", temporal: "COMPLETED", localSessions: { CN_A: 60, US_EQUITY: 60, authoritativeObservations: 120 }, automaticTrading: "NOT_RUN" });
  });

  it("fails closed if a daily read shows an order or any ledger cash/position change", async () => {
    const session = input.sessions[0]!;
    await expect(verifyV15NoTradeSession(input, session, accounts.CN_A, {
      readAccount: async () => ({ ...accounts.CN_A, cash: { amount: "9999.00", currency: "CNY" } }),
      readBrokerSummary: async (namespace) => ({ namespace, brokerMode: "FAKE", order_count: 1, fill_count: 0, unresolved_order_count: 0, pending_outbox_count: 0, externalOnlyOrderCount: 0 }),
    })).rejects.toThrow("cash, ledger or reserved budget changed");
  });

  it("does not complete a partial calendar observation", async () => {
    await expect(completeV15NoTrade(input, accounts, [] as never, { saveRun: async (run) => run as never })).rejects.toThrow("exactly 60 ordered authoritative observations");
  });
});
