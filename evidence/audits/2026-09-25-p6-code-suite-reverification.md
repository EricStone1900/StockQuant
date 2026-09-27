# V2.5 code-suite re-verification

Date: 2026-09-25 (Asia/Shanghai). The run revalidated the current working tree; it does not close V2.5 or the independent V2.4 observation gate.

Command: `pnpm verify:stage -- --stage V2.5 --suite code`. The first sandboxed attempt stopped with exit 2 because the isolated local PostgreSQL endpoint was inaccessible (`EPERM`/unreachable prerequisite). Re-running with local access to the dedicated test databases completed successfully with exit 0; no activity database was used.

Verified scope: baseline Markdown links (587), contract validation (69 JSON files, 37 schemas, 24 fixtures, 26 compatibility rules), 13 data Fixture hashes; monorepo build, lint and typecheck; 242 service/Web unit tests; trade-execution persistence and HTTP identity smokes; Portfolio Risk 3 isolated PostgreSQL tests and HTTP resource reservation/fill smoke; 55 Python market-data adapter tests; 92 operations script tests; and 20 market-data PostgreSQL integration tests. All passed.

This remains code evidence only. It does not establish full historical-minute capacity, source stability during live trading sessions, a complete alternate 60-day minute source, missing point-in-time revision coverage, the V2.4 20-trading-day observation, or additional user acceptance. Existing historical signatures and live observation records remain unchanged.
