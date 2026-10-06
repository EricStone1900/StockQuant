# W5 / V3.1 current-worktree code-suite refresh

Date: 2026-10-02 (Asia/Shanghai)

## Scope and result

Ran the complete planned command `pnpm verify:stage -- --stage V3.1 --suite code` against the existing current-worktree linux/amd64 Research Automation image `stockquant-w8-20261002-current-research-automation-service:latest`, pinned to immutable ID `sha256:550a7435138aa60ec32f672e58b82e76ceb3b5cbdf313ec244435e1929fb6f75`. The suite exited 0.

- Evidence export tests: 9/9; owner session, exact TestRun binding, immutable Artifact hashes, no-overwrite repeat behavior, wrong-owner rejection, and tamper rejection passed.
- Contract schemas/fixtures and generated-client drift checks passed: 211 JSON files, 146 schemas, 36 fixtures, 24 registered client generators.
- Research Automation: lint/build passed, 34 unit files / 189 tests passed, 4 integration files / 26 tests passed.
- V3.3 isolated PostgreSQL pagination probe passed against 66,100 synthetic rows; this remains a read-pagination engineering probe, not production dispatch capacity.
- Model Gateway Fixture HTTP smoke passed, including idempotent budget reserve/dispatch/settle and UNKNOWN holds; `externalCalls=0`.
- Production settlement guard smoke passed: settlement endpoint returned 404, budget stayed RESERVED at 0 spent cents, and no external calls occurred.
- LiteLLM internal-only smoke passed for fixed Fixture chat and embeddings; budget rows were `SETTLED,SETTLED|120|120|46|2`; external Provider calls were zero.
- Platform API: 45 test files / 156 tests passed. Artifact owner-scope/evidence-export HTTP smoke passed (`testRunId=36a342af-9324-47fe-9190-2f7aaf0edb24`), including unauthorized/foreign-owner/unlisted-ref rejection and exact manifest byte verification; `activeServicesTouched=false`.
- Web typecheck passed.

## Retained attempts and limits

The first run failed because the sandbox denied a loopback listener (`listen EPERM 127.0.0.1`), not because of an assertion. The first permitted-loopback rerun then correctly failed the smoke prerequisite because the supplied image ID did not match the default image reference. The next run used a different existing current-worktree image reference and its matching exact ID; all checks passed. These failed attempts are retained here and do not replace or erase prior evidence.

No Provider API or market-data source was contacted. The HTTP smoke uses temporary isolated resources. No active Compose service was restarted; fixture owner-scope smoke explicitly reported `activeServicesTouched=false`. This code suite does not prove real RD-Agent/provider execution, invoice reconciliation, market-data authorization, business acceptance, user sign-off, Ubuntu behavior, or long-running O1/O2 observations. W5/V3.1 remains incomplete and model gateway authorization remains disabled.
