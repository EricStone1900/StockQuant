# P5.7 FakeBroker Outbox reservation binding

Date: 2026-09-25 (Asia/Shanghai). Scope: local trade-execution FakeBroker command, idempotency, and Portfolio request wiring. This does not authorize Paper execution.

The FakeBroker execution command now accepts an optional reservation identity (`reservationId`, `ownerId`, `testRunId`, `clientOrderId`) and explicit currency. It rejects malformed currency and a reservation bound to a different client order before persisting any order. The semantic request fingerprint includes side, currency, and the full reservation identity, so reusing an idempotency key with changed binding conflicts.

When a fill is created, the same PostgreSQL transaction stores side, currency, and reservation identity in the durable `FILL_POST` Outbox payload alongside the FakeBroker fill. The delivery adapter forwards these fields to Portfolio; Portfolio remains the authority that checks account, owner, namespace, TestRun, order, currency, side, and reserved capacity. Legacy payloads retain the existing BUY/CNY defaults. After an Outbox event is accepted, one FakeBroker transaction marks it delivered and restores an order from `LEDGER_PENDING` to `FILLED` or `PARTIALLY_FILLED` from its persisted fill quantity; this prevents a successful retry from leaving the order permanently pending.

Verification:

- `pnpm --filter @stockquant/trade-execution-service test`: 5 files, 32 tests passed.
- `pnpm --filter @stockquant/trade-execution-service typecheck`: passed.
- `pnpm --filter @stockquant/trade-execution-service build`: passed.
- `pnpm --filter @stockquant/trade-execution-service test:integration`: the first sandboxed attempt returned exit 2 because the loopback PostgreSQL port was unavailable to the sandbox. Re-running with the permitted local test runtime against the dedicated test databases passed persistence, caller-scope HTTP, and the P5.7 recovery smoke.
- The P5.7 HTTP smoke starts temporary Portfolio and trade-execution processes using only `portfolio_risk_test` and `trade_execution_test`. It confirms the reserved partial Fill is committed, deliberately drops the successful Portfolio response, observes `LEDGER_PENDING`/`PENDING`, terminates and restarts trade execution, then observes Outbox `DELIVERED` and FakeBroker `PARTIALLY_FILLED`. Portfolio contains one Fill and two ledger rows (opening balance plus Fill), cash is exactly `8997.9990`, and the reservation has captured `1002.0010` while its UNKNOWN remainder stays held; an additional `8100.0000` reservation is rejected with 409. The Outbox takes two attempts, and all temporary HTTP processes plus exact random-run database rows are cleaned and verified.
- This smoke found and verified the fix for a recovery defect: before the fix, successful Outbox delivery left the FakeBroker order in `LEDGER_PENDING`; after the fix, Outbox delivery and order-status restoration commit together.
- The smoke's governance endpoint is an explicit test stub that verifies the trade-execution Bearer caller and returns success; it does not validate a real Mandate, risk policy or execution authorization. The account is an isolated PAPER/FAKE test account, but this smoke is data-plane evidence only and grants no Paper authority.

Remaining: real governance/Mandate/risk/quote gating, production deployment, formal reconciliation UI/CLI acceptance and human sign-off have not been demonstrated. Historical FakeBroker authorization remains governed by the BACKTEST replay caller; the test stub is not an authorization substitute. The service-to-service Outbox delivery, lost-response replay, process restart recovery, exact ledger application and UNKNOWN resource retention are locally verified. Keep Paper acceptance NOT_RUN/HOLD until its independent gates pass.
