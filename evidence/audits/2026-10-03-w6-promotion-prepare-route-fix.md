# W6 Promotion prepare route contract fix

Date: 2026-10-03 (Asia/Shanghai)

The authenticated `POST /v1/promotions/prepare` endpoint incorrectly validated its `{testRunId, experimentId}` request as a complete Runner Job, making the V3.2 preparation path return 422 before reaching the preparer. The route now accepts exactly those two valid UUID fields and rejects arrays, extra properties, missing values, and invalid UUIDs. Runner Job validation remains on Runner Job routes; authorization remains restricted to `platform-api-service`.

Verification:

- `pnpm --filter @stockquant/research-automation-service lint`: PASS.
- `pnpm --filter @stockquant/research-automation-service test`: 203/203 PASS (36 files).
- `pnpm --filter @stockquant/research-automation-service build`: PASS.
- `pnpm --filter @stockquant/research-automation-service v32:promotion-prepare-http-smoke`: PASS. It verified stable preparation replay, synthetic authoritative gate behavior, durable submission replay, candidate access scoping, and no Registry mutation. Two negative cases (extra property and invalid UUID) were added.

The first smoke attempt used stale `dist` output and reproduced the previous 422; after building the modified source, the smoke passed. The default sandbox also denied test-only loopback sockets; the successful run used the approved local test execution. This remains isolated synthetic integration evidence only: no real Provider, market-data, Paper, Broker, Registry/Mandate activation, or user acceptance occurred. V3.2 remains `NOT_RUN` overall.

Follow-up stage regression: the full `pnpm verify:stage -- --stage V3.2 --suite code` exited 0 after the fix; all included contract, Fixture, independent-recompute, service integration, persistence readiness, and build checks passed. `pnpm test:e2e -- --stage V3.2` also exited 0 (5/5 Playwright scenarios). These remain engineering/Mock/Fixture checks and do not change the version or human acceptance status.

The route contract is now frozen in OpenAPI and JSON Schema, including platform-only Bearer identity, strict UUID command and typed `WAITING`/`READY_FOR_GATE_CHECK` response. `pnpm contracts:check` passed with 153 schemas, 107 compatibility rules, three Research Promotion operations, and the new schema positive/negative test; Research Automation lint and 203/203 unit tests also passed. Full V3.2 code-suite rerun after this contract freeze is recorded separately when complete.

After contract freeze, `pnpm verify:stage -- --stage V3.2 --suite code` exited 0. It reran the 153-schema/107-rule contract checks, Research 203/203, Platform 166/166 and 5/5 integration tests, the isolation HTTP smoke, the Linux/amd64 readiness-container restart test (TestRun `2faaad96-25f1-47ae-811b-051a9dc23df8`), and Web typecheck/build/test. Readiness remained `WAITING/READINESS_ONLY/NOT_RUN`; active services were untouched, with zero Paper calls and no active Registry mutation. Full command output is preserved in the adjacent `.log` file.

The post-contract-freeze `pnpm test:e2e -- --stage V3.2` also passed all five Chromium scenarios: readiness persistence/re-read, immutable evidence state, owner submission gating, exact-version approval boundary, and candidate-to-Mandate binding without activation.
