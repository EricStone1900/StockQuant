# V3.2 code suite re-verification (2026-09-27)

## Result

`pnpm verify:stage -- --stage V3.2 --suite code` completed with exit code 0 in the local isolated test environment.

The first sandboxed attempt reached the Qlib Worker boundary test and failed during its ephemeral `127.0.0.1` bind with `EPERM`. It did not report a test assertion failure. The same command was then rerun in the approved local test environment and completed successfully; both outcomes are retained here.

## Verified scope

- Baseline: 817 Markdown links; 120 JSON files, 69 schemas, and 34 contract fixtures validated; 56 compatibility rules and 11 OpenAPI documents checked; all 18 frozen Fixture files verified.
- Quant Research: TypeScript typecheck, 48 unit tests, 12 Python Worker tests, isolated reference recomputation, and dual ARM64 restricted-container candidate/evaluator PostgreSQL+HTTP integration passed.
- Research Automation: build, 139 unit tests, and random isolated PostgreSQL/HTTP preparation, guarded submit/replay, and candidate Artifact retrieval smoke passed.
- Platform API: build and 64 unit tests passed.
- Web: typecheck, production build, and 1 unit test passed.
- Stage verifier returned `status=PASS`, `businessValidation=NOT_RUN`, `activeRegistryMutation=NOT_PERFORMED`, `isolatedSyntheticRegistryMutation=PERFORMED_IN_DISPOSABLE_TEST_DATABASE`, and `humanAcceptance=NOT_RUN`.

## Limits

This is a code-suite result using frozen synthetic inputs and disposable test databases. It does not prove real RD-Agent/model execution, arbitrary user-candidate semantics, market validity or profitability, V3.1 acceptance, a formal V3.2 business TestRun/export, active Registry/Mandate changes, Ubuntu deployment, observation completion, or human acceptance. No active service was deployed or changed.
