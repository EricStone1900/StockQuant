# V1.4 unisolated browser attempt: preserved, excluded from acceptance

Date: 2026-10-02 (Asia/Shanghai)

A focused Playwright command was first run directly through the Web package. The Vite server used its default API proxy `http://127.0.0.1:3000`, which resolved to the existing `stockquant-v12-platform-api-service-1` rather than the V1.4 isolated Compose stack. The test inserted one completed Platform TestRun in the active `platform_api` database:

- TestRun: `516282a1-12f7-49bf-8800-33bc6d6632c5`
- Scenario/status: `V1.4` / `normal` / `COMPLETED`
- Owner scope: `acceptance-owner-1`
- Created: `2026-10-02T01:14:48.790Z`
- Active API image returned the older Platform-shaped evidence (`codeVersion=8748ddc`, legacy metric fields), so it did not exercise the current configurable Web-to-Quant path.

The exact owner-scoped API response is preserved in the adjacent JSON. A read-only query confirmed the active Quant database has no `research_backtest_runs` relation; the query failed without changing the database. The test's policy assertion failed because this old active page submitted the fixed default policy. This run is not bound into stage acceptance and must not count as evidence for the current source change.

No cleanup or deletion was performed. No source, Paper, broker, or external provider call was made. This record documents an execution mistake and preserves the resulting active TestRun; all further V1.4 browser verification uses the dedicated random-name isolated Compose harness.
