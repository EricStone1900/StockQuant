# W6 V3.2 readiness TestRun export

Date: 2026-09-30. Scope: export only an existing owner-scoped V3.2 `READINESS_ONLY` TestRun via the local session route. This is preparation evidence; it is not candidate business validation or user acceptance.

Implementation adds `--stage V3.2 --run <testRunId>` to `scripts/evidence-export-core.mjs` and the CLI. The exporter calls `GET /api/v1/acceptance/v3/v3.2/runs/{testRunId}` with the supplied `sq_session`, checks exact run ID and stage, and accepts only persisted readiness records in `WAITING` with business validation and human acceptance both `NOT_RUN`. It atomically creates `evidence.json` and `manifest.sha256` below `evidence/local/V3.2/<testRunId>` and refuses to overwrite an existing directory. PromotionRequest snapshot export remains a separate `--promotion-request` path.

Verification:

- `node --test scripts/evidence-export.test.mjs`: exit 0, 7/7.
- `node scripts/evidence-export-http-smoke.mjs`: exit 0, 7 cases covering owner session, exact PromotionRequest/TestRun binding, digest verification, WAITING/NOT_RUN preservation, wrong-owner rejection, mismatch rejection, and non-overwrite behavior.
- `pnpm test:ops`: exit 0, 154/154, after a restricted-sandbox attempt failed only where two pre-existing CLI HTTP tests could not bind `127.0.0.1`; the controlled loopback rerun passed. Temporary test listeners and export files were cleaned by the tests.
- `pnpm contracts:check`: exit 0; 173 JSON files, 114 schemas, 36 fixtures, generated clients and 96 compatibility rules checked.
- `pnpm docs:check`: exit 0 after syncing the stage manual and acceptance index; 1244 local links, zero failures.
- `git diff --check`: exit 0.
- `pnpm verify:stage -- --stage V3.2 --suite code`: exit 0 / machine report `status=PASS`. This rerun completed the contracts/Fixture baseline, independent synthetic candidate recomputation and guarded preparation flows, Research Automation 31 files/169 unit tests, Platform 27 files/96 unit tests plus 3 integration tests, disposable SCRAM PostgreSQL/container readiness restart smoke, and Web typecheck/build/unit tests. Runtime report retained `businessValidation=NOT_RUN`, `activeRegistryMutation=NOT_PERFORMED`, and `humanAcceptance=NOT_RUN`.

The first V3.2 full code-suite attempt stopped at baseline documentation validation because this referenced audit had not yet been created; it did not reach or fail a business/code test. After creating the audit, documentation links and the complete code suite passed. No active service, database, market-data source, Provider, Registry or Paper account was contacted or changed. The HTTP smoke wrote only beneath a disposable temporary directory and removed it on completion; no export was made into the repository's acceptance evidence path.

Boundaries still open: formal V3.2 candidate execution/TestRun, independent real-data recomputation, exact-version user approval, Paper consumption, stage acceptance and human sign-off.
