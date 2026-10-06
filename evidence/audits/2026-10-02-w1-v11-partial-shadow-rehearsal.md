# W1 / V1.1 current partial-shadow migration rehearsal

Captured: 2026-10-02 10:51 Asia/Shanghai

## Change

The active cutover CLI previously rejected any nonempty V1.1 unified shadow, despite the current local Platform database already containing 44 valid shadow rows for 49 legacy TestRuns. The CLI now computes the exact missing-row count and requires full source/target parity after idempotent migration. It still rejects recent nonterminal runs, an overfull target, and any field conflict; the cutover-only `--apply` guard and exact local-database restriction remain.

## Current-snapshot rehearsal

A read-only custom-format dump of `platform_api` was 113,204 bytes with SHA-256 `9bd97e60dd85c3bf272a751b411ffba7953ca3e6ed67ba3120a41a19913ef113`. It was restored to the randomly named `platform_shadow_d645bb1cae6341de` database. `pnpm --filter @stockquant/platform-api-service test:legacy-migration-rehearsal` passed:

- 49 legacy rows, 44 existing shadow rows, and exactly 5 missing rows inserted.
- 43 COMPLETED, 3 FAILED, 2 RUNNING and 1 WAITING source records.
- Core field mismatches: 0; acceptance-history mismatches: 0; idempotent second pass inserts: 0.
- Owner-scoped stage read, new-run dual write and parity after dual write: PASS.
- Recent nonterminal rows within 24 hours: 0. The 2 historical RUNNING and 1 WAITING rows remain and require operator review under Runbook step 4.

After cleanup, read-only verification found legacy=49, V1.1 shadow=44, temporary shadow database count=0, all `platform_shadow_%` databases=0, temporary dump absent, and PostgreSQL healthy. The active Platform API and PostgreSQL containers remained running and healthy with their original start times. No active migration, API restart, write, source request or acceptance change occurred.

The first restore invocation included an unsupported `-` filename and failed before rehearsal; its cleanup removed the exact shadow and dump. The corrected stdin restore and rehearsal then passed. The final raw output is preserved in [rehearsal.log](./2026-10-02-w1-v11-partial-shadow-rehearsal.log).

## Code verification and remaining gate

- New V1.1 migration preflight tests: 4/4 PASS; Platform typecheck/build PASS.
- `pnpm verify:stage -- --stage V1.1 --suite code`: exit 0; Platform unit suite 46 files / 162 tests PASS.
- No activity cutover was executed. The current setting remains `STOCKQUANT_V11_RUN_STORAGE=legacy` until a Runbook-compliant maintenance window is arranged.

Maintenance-window start/end, affected scope and rollback owner are still unconfirmed. The two old RUNNING rows and one old WAITING row also need operator disposition. Therefore the cutover remains `NOT_AUTHORIZED / NOT_DEPLOYED`; W1 and full-plan acceptance remain incomplete.
