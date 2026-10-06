# W9 refresh after Platform readiness probe change — 2026-10-02

- Platform readiness probe adapter: 45 unit files / 156 tests PASS; typecheck and build PASS.
- `pnpm baseline:check`: PASS, including 2,116 links at the time of the run, contract and Fixture validation, all eight service layer checks, and 25 architecture/version-gate tests.
- `pnpm verify:stage -- --stage V1.1 --suite code`: controlled local run exit 0. A sandbox-only attempt failed because the Quant Worker boundary test could not bind its random loopback port (`EPERM`); the controlled run completed the same required suite successfully.
- Current version gates: V1 INCOMPLETE (17 TestRun UUID associations unresolved); V2 INCOMPLETE (9 UUIDs, 8 associations unresolved); V3 INCOMPLETE (no exact UUIDs, TestRun audit NOT_RUN). All three stage-document and linked-evidence audits PASS, with no invalid PASS claims.
- `pnpm verify:version:evidence` for V1/V2/V3: PASS after refreshing the Platform architecture entry in `2026-10-01-w1-qlib-legacy-jsonb-backfill.sha256`; 2,119 Markdown links currently pass.
- `git diff --check`: PASS.

The manifest refresh only updates the expected hash for a Platform architecture file changed by this engineering increment. It does not alter the historical audit contents or imply Qlib backfill/acceptance. No source data, Paper run, activity service, or persistent business state was touched. No observation day accrued.
