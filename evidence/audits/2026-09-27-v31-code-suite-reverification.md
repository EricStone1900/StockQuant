# V3.1 code suite current-worktree reverification

Ran `pnpm verify:stage -- --stage V3.1 --suite code` against the current checkout.

The first sandboxed attempt passed contract checks, Research Automation typecheck and 139 unit tests, then failed only because the sandbox denied loopback access to `127.0.0.1:5433`; four PostgreSQL integration suites consequently reported EPERM and skipped their assertions. The same full command was rerun in the authorized local test environment and exited 0.

Verified scope:

- Contract validation: 120 JSON documents, 69 schemas, 34 Fixtures, 56 compatibility rules and 11 OpenAPI groups.
- Research Automation: TypeScript lint, 24 unit files / 139 tests, and 4 PostgreSQL integration files / 17 tests.
- Platform API: typecheck, 20 unit files / 65 tests, and the isolated V3.1 artifact-owner HTTP smoke.
- Web TypeScript typecheck.

The isolated HTTP smoke passed with missing identity 401, foreign owner 403, unlisted artifact 404, anonymous gate 401, wrong service token 403, idempotent acceptance replay and changed-note conflict 409. Its output reports `activeServicesTouched: false`; the accepted item is synthetic test data and did not alter user acceptance.

This is code and isolated-test evidence only. It does not run the real model gateway/RD-Agent, produce a real V3.1 business TestRun, establish user acceptance, deploy or rotate active service credentials, or prove Ubuntu compatibility. V3.1 formal business validation and human acceptance remain NOT_RUN.
