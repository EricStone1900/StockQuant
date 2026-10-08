# P1 account identity and ledger matrix

Date: 2026-10-07 (Asia/Shanghai). Result: PASS for the P1 account initialization, identity and ledger verification item. Human acceptance remains unchanged.

## Verification

The V1.1 `--suite code` branch now delegates to the registered complete code-suite plan. This restores PostgreSQL-backed Portfolio integration, Trade Execution integration, Python adapter, ops and Market Data checks that the previous short branch omitted. The earlier green run with the short list is retained as a Web slice only.

`pnpm test:e2e -- --stage V1.1` exited 0 on the corrected tree. It ran the complete V1.1 code checks and isolated Chromium Web/API/CLI scenarios. Browser-created normal, rejection and recovery runs all passed; the same TestRun IDs were checked read-only through CLI. The recovery action restarted only the verified random-project Portfolio service. Harness cleanup verified removal of project containers, PostgreSQL volume, network and images.

The current PostgreSQL integration suite passed 5/5. Its new case initializes separate CN_A/CNY and US_EQUITY/USD accounts in one isolated TestRun, verifies distinct account IDs and one initial ledger entry per currency, repeats an identical initialization key successfully, rejects changed cash and a foreign owner on that key, and denies a foreign owner's snapshot. Portfolio's real HTTP/PostgreSQL identity smoke also passed: owner read succeeded, foreign owner read returned 403, and a LIVE/LIVE initialization request returned 403 before creating any account. Reservation replay, fill replay, fee correction, UNKNOWN hold and cross-owner resolution checks passed in the same smoke.

The V1.3 current-tree E2E audit separately records CN and US FakeBroker execution and proposal owner/TestRun binding, including US TestRun `7a8b865f-0b05-461f-8c89-91b13be34953`; see [the V1.3 governance coordination audit](./2026-10-07-v13-governance-coordination-after-revision.md). The full V1.1 pass and V1.3 evidence together close the account matrix. They do not close the P1 TestRun/outbox transaction, general Artifact lifecycle, active-storage cutover, P1 parent or V1 release gate.

## Preserved failure history

The first corrected full suite run exposed an outdated P5.7 expected cash value: the fixed historical bar applies the documented 10bp BUY slippage and the later cumulative report contributes only its incremental 25 shares. The observed amounts were 50 shares at 10.2200 with fee 0.5110, then 25 shares at 10.2000 with fee 0.0100; total captured cash is 766.5210. The test expected 766.0305. The first repair attempt also exposed PostgreSQL's NULL sequence sort order and text-vs-number row types. Both attempts are retained below. Assertions now check each authoritative fill and the resulting exact cash/reservation totals; the targeted retry and final full suite pass.

## TestRuns and resources

V1.1 Web/CLI same-run IDs: normal `6cc34f1d-dd0a-481f-b5b3-22e290064360`, rejection `21212e16-efba-44a9-a861-278250098849`, recovery `c2b414ad-5fee-4eb7-9d3e-68738600f5d3`. The final V1.1 isolated Compose project was `sq-v11-stage-9e7fb9f07ab6b49808da`. Portfolio HTTP smoke TestRun: `4911585e-6ebc-45de-bbed-ad821d6f299e`. Targeted FakeBroker Outbox recovery TestRun: `ece9a322-63a9-458b-9010-d1f0a730f7bb`; it verified exact fee/slippage totals, same-sequence replay, restart recovery and isolated DB cleanup.

Raw evidence:

- [Final complete V1.1 code/Web/CLI run](./2026-10-07-p1-v11-complete-account-matrix.log)
- [Earlier short-suite V1.1 run (not a complete code-suite result)](./2026-10-07-p1-v11-account-web-e2e.log)
- [First full-suite failure with stale P5.7 expected cash](./2026-10-07-p1-v11-full-code-suite-web-e2e.log)
- [First targeted repair attempt failure](./2026-10-07-p1-p57-slippage-expectation-fix.log)
- [Targeted P5.7 repair pass](./2026-10-07-p1-p57-slippage-expectation-fix-retry.log)
- [Intermediate full-suite pass before the LIVE HTTP assertion was added](./2026-10-07-p1-v11-full-code-suite-web-e2e-retry.log)
- [Source and log SHA-256 manifest](./2026-10-07-p1-account-identity-ledger-matrix.sha256)

Automated PASS is not a new human signature. Existing user acceptance history is preserved as-is; this engineering verification does not extend its scope.
