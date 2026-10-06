# W3 V2.4 full code suite rerun

Date: 2026-10-02 (Asia/Shanghai)

Command: `pnpm verify:stage -- --stage V2.4 --suite code`

Final result: exit 0. The suite passed baseline/docs/contracts/Fixtures, full build/lint/typecheck/unit checks, PostgreSQL-backed integrations, service-auth HTTP checks, the Qlib worker unit tests, P5.7 Trade→Portfolio Outbox recovery, V2.4 isolated Paper API/Web/CLI scenarios, and Linux ARM64 readiness. The V2.4 smoke report is [2026-10-02-v24-paper-smoke-ecf6a18634664359a95206ae0f53b5bf.json](2026-10-02-v24-paper-smoke-ecf6a18634664359a95206ae0f53b5bf.json). Its four scenarios cover normal Fixture execution, stale-snapshot rejection, lost-response recovery, and an independent external FakeBroker order discrepancy; all four Web TestRuns were checked against the same IDs through the CLI.

Failure history retained: the first run stopped when the sandbox denied a Qlib worker test binding to a temporary `127.0.0.1` port. After the bounded permission was granted, a subsequent run reached P5.7 but its disposable PostgreSQL container shut down while creating its second test database. The same fixed suite then completed successfully; P5.7 passed on that run, and its disposable container/network were verified removed.

All business tests used isolated local PostgreSQL and FakeBroker processes. Active services were not connected; no quote provider, external market-data endpoint, real broker, or LIVE operation was used. This suite does not complete the continuous Paper execution policy, real-source authorization, 20-trading-day observation, O2, or human acceptance. V2.4 remains `PARTIALLY_IMPLEMENTED`.
