import { PostgresTestRunRepository } from "../adapters/postgres-test-run-repository.js";
import type { ScenarioId, TestAssertion, TestRun } from "../domain/test-run.js";

interface AccountSnapshot {
  accountId: string;
  cash: { amount: string; currency: string };
  positionCount: number;
  ledgerEntryCount: number;
  namespace: string;
  testRunId: string;
}

interface InitializeResult {
  snapshot: AccountSnapshot;
  replayed: boolean;
}

export class ScenarioRunner {
  constructor(
    private readonly repository: PostgresTestRunRepository,
    private readonly portfolioApiUrl: string
  ) {}

  async start(testRunId: string, ownerId: string): Promise<void> {
    const run = await this.repository.find(testRunId, ownerId);
    if (!run || run.status !== "QUEUED") return;
    await this.repository.updateStatus(run.testRunId, "RUNNING");
    try {
      if (run.scenarioId === "recovery") {
        await this.prepareRecovery(run);
        return;
      }
      await this.runAssertions(run);
    } catch (error) {
      await this.repository.updateStatus(run.testRunId, "FAILED", null, error instanceof Error ? error.message : "unknown failure");
    }
  }

  async continueRecovery(testRunId: string, ownerId: string): Promise<void> {
    const run = await this.repository.find(testRunId, ownerId);
    if (!run || run.scenarioId !== "recovery" || run.status !== "WAITING" || !run.accountId) return;
    await this.repository.updateStatus(run.testRunId, "RUNNING");
    try {
      const snapshot = await this.snapshot(run.accountId, run.ownerId);
      const assertions = [
        this.assertion(
          "V1.1-RECOVERY-001",
          { ledgerEntryCount: 1, cash: { amount: "10000.0000", currency: "CNY" } },
          { ledgerEntryCount: snapshot.ledgerEntryCount, cash: snapshot.cash },
          { accountId: run.accountId, restartVerifiedBy: "post-restart snapshot query" }
        ),
        this.assertion(
          "V1.1-RUN-ISOLATION-001",
          { namespace: run.namespace, testRunId: run.testRunId },
          { namespace: snapshot.namespace, testRunId: snapshot.testRunId },
          { accountId: run.accountId }
        )
      ];
      await this.repository.replaceAssertions(run.testRunId, assertions);
      await this.repository.updateStatus(run.testRunId, assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED", run.accountId);
    } catch (error) {
      await this.repository.updateStatus(run.testRunId, "FAILED", run.accountId, error instanceof Error ? error.message : "recovery verification failed");
    }
  }

  private async runAssertions(run: TestRun): Promise<void> {
    const amount = run.scenarioId === "normal" ? "10000.00" : "10000.00";
    const command = this.commandFor(run, amount);
    const first = await this.initialize(command);
    const accountId = first.snapshot.accountId;
    const assertions: TestAssertion[] = [];
    if (run.scenarioId === "normal") {
      const replays = await Promise.all(Array.from({ length: 10 }, () => this.initialize(command)));
      const snapshot = await this.snapshot(accountId, run.ownerId);
      assertions.push(this.assertion(
        "V1.1-ACCOUNT-INIT-001",
        { cash: { amount: "10000.0000", currency: "CNY" }, ledgerEntryCount: 1, positionCount: 0 },
        { cash: snapshot.cash, ledgerEntryCount: snapshot.ledgerEntryCount, positionCount: snapshot.positionCount },
        { accountId, firstReplayed: first.replayed, retriesReplayed: replays.every((result) => result.replayed) }
      ));
      assertions.push(this.assertion(
        "V1.1-ACCOUNT-IDEMPOTENCY-001",
        { replayCount: 10, allReplayed: true },
        { replayCount: replays.length, allReplayed: replays.every((result) => result.replayed) },
        { accountId }
      ));
    } else {
      const conflictResponse = await fetch(`${this.portfolioApiUrl}/internal/v1/accounts/initialize`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service" },
        body: JSON.stringify(this.commandFor(run, "20000.00"))
      });
      const snapshot = await this.snapshot(accountId, run.ownerId);
      assertions.push(this.assertion(
        "V1.1-ACCOUNT-CONFLICT-001",
        { httpStatus: 409, cash: { amount: "10000.0000", currency: "CNY" }, ledgerEntryCount: 1 },
        { httpStatus: conflictResponse.status, cash: snapshot.cash, ledgerEntryCount: snapshot.ledgerEntryCount },
        { accountId, conflictBody: await conflictResponse.json().catch(() => null) }
      ));
      assertions.push(this.assertion(
        "V1.1-ACCOUNT-AUTHORIZATION-001",
          { foreignOwnerQueryStatus: 403 },
        { foreignOwnerQueryStatus: await this.snapshotStatus(accountId, "foreign-owner") },
        { accountId, reason: "portfolio service does not reveal out-of-scope accounts" }
      ));
    }
    await this.repository.replaceAssertions(run.testRunId, assertions);
    await this.repository.updateStatus(run.testRunId, assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED", accountId);
  }

  private async prepareRecovery(run: TestRun): Promise<void> {
    const initialized = await this.initialize(this.commandFor(run, "10000.00"));
    await this.repository.replaceAssertions(run.testRunId, [{
      assertionId: "V1.1-RECOVERY-001",
      status: "WAITING",
      expected: "Restart portfolio-risk-service, then continue the original testRunId",
      actual: { accountId: initialized.snapshot.accountId },
      evidence: { namespace: run.namespace, testRunId: run.testRunId }
    }]);
    await this.repository.updateStatus(run.testRunId, "WAITING", initialized.snapshot.accountId);
  }

  private commandFor(run: TestRun, amount: string) {
    return {
      fixtureAccountRef: "cn-paper-empty-10000-cny",
      ownerId: run.ownerId,
      market: "CN_A",
      environmentMode: "PAPER",
      brokerMode: "FAKE",
      initialCash: { amount, currency: "CNY" },
      namespace: run.namespace,
      testRunId: run.testRunId,
      idempotencyKey: "v1.1-account-initialization"
    };
  }

  private async initialize(command: object): Promise<InitializeResult> {
    const response = await fetch(`${this.portfolioApiUrl}/internal/v1/accounts/initialize`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service" },
      body: JSON.stringify(command)
    });
    if (!response.ok) throw new Error(`portfolio initialize failed: ${response.status}`);
    return response.json() as Promise<InitializeResult>;
  }

  private async snapshot(accountId: string, ownerId: string): Promise<AccountSnapshot> {
    const response = await fetch(`${this.portfolioApiUrl}/internal/v1/accounts/${accountId}/snapshot`, {
      headers: { "x-stockquant-service-id": "platform-api-service", "x-stockquant-owner-id": ownerId }
    });
    if (!response.ok) throw new Error(`portfolio snapshot failed: ${response.status}`);
    return response.json() as Promise<AccountSnapshot>;
  }

  private async snapshotStatus(accountId: string, ownerId: string): Promise<number> {
    const response = await fetch(`${this.portfolioApiUrl}/internal/v1/accounts/${accountId}/snapshot`, {
      headers: { "x-stockquant-service-id": "platform-api-service", "x-stockquant-owner-id": ownerId }
    });
    return response.status;
  }

  private assertion(assertionId: string, expected: unknown, actual: unknown, evidence: Record<string, unknown>): TestAssertion {
    return {
      assertionId,
      status: JSON.stringify(expected) === JSON.stringify(actual) ? "PASS" : "FAIL",
      expected,
      actual,
      evidence
    };
  }
}
