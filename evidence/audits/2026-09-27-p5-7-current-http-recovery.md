# P5.7 current-worktree durable Outbox recovery verification

Executed from the current StockQuant checkout on 2026-09-27:

- `pnpm --filter @stockquant/trade-execution-service test`: 7 files / 42 tests passed.
- `pnpm --filter @stockquant/trade-execution-service lint`: passed.
- `pnpm --filter @stockquant/trade-execution-service build`: passed.
- `pnpm --filter @stockquant/trade-execution-service test:integration`: persistence/idempotency, route identity, and P5.7 two-service HTTP smoke all passed against dedicated `trade_execution_test` and `portfolio_risk_test` databases.
- Re-ran `pnpm --filter @stockquant/trade-execution-service test:p5-7` after adding the TestRun and namespace to the smoke output; passed again.

Latest P5.7 run IDs: TestRun `d432fb4b-499d-446a-a219-1ad489e63012`, namespace `p57-outbox-http/86f721de-a8da-47b6-b455-62a280f08784`, order `4a4f33e5-90e7-43f8-8c44-b4d0eb703d46`, account `4b34e81a-c184-435a-8f7d-2866d72863ce`, reservation `f5c048a4-0c5d-43cb-88b2-105af88f27e6`.

The Portfolio committed the Fill but the first response was dropped. Before restart, the order was `LEDGER_PENDING`, Outbox was pending after one attempt. Concurrent claims produced one winner; after lease expiry, takeover changed the fencing token and stale ack/failure callbacks were rejected. Restarted Trade Execution retried and delivered the durable Outbox, restoring order `PARTIALLY_FILLED`; exactly one Portfolio Fill and two ledger entries remained during assertions. Captured cash was `1002.0010`, remaining cash `8997.9990`. Setting the unresolved remainder to `UNKNOWN` retained the reservation and rejected an over-reservation. Script cleanup verified and removed the exact random account, reservation, fills, ledger entries, order, event and Outbox rows.

The related identity smoke verified missing/wrong identities and disallowed route scopes return 403, while authorized governed execution succeeds. These tests use FakeBroker and synthetic test data. They do not connect the V2.4 SNAPSHOT path to an authorized Mandate/risk policy, deploy current sources to active Paper, satisfy OD-007, prove continuous Paper availability, or complete stage/human acceptance.
