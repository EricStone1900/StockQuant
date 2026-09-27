# V3.2 guarded PromotionRequest submission

Date: 2026-09-27 (Asia/Shanghai)

## Implemented behavior

Research Automation now exposes `POST /v1/promotions/submit`, scoped to the Platform API service identity. The coordinator prepares the immutable PromotionRequest, reads `GET /internal/v1/acceptance/v3/v3.1/gate/{testRunId}` from Platform with the distinct Research Automation Bearer identity, and returns `WAITING` unless the same TestRun has V3.1 `PASS`, human `ACCEPTED`, and a valid evidence SHA-256. It opens the durable PostgreSQL submit journal and calls Quant only after that check. Ambiguous submit outcomes stay `UNKNOWN` for exact-key reconciliation; an already successful journal state is replayed without another Quant call. No approval or activation operation was added.

Platform also exposes an owner-session `POST /api/v1/acceptance/v3/v3.2/runs/{testRunId}/promotion-submission` action. It requires explicit submission confirmation, derives the experiment identity from the owner's stored normal V3.1 TestRun, then proxies to Research Automation with the Platform service identity. It does not alter the V3.1 human acceptance record.

Compose supplies Platform and Quant service URLs and the independent Research Automation token. Contracts, compatibility rules, and OpenAPI now describe the acceptance command/read and guarded submission command/result.

## Verification

- Final `pnpm verify:stage -- --stage V3.2 --suite code` exited 0 after all route and contract edits. It covered the repository baseline, quant 39 TypeScript + 12 Python tests, independent synthetic recomputation (70 decisions), candidate and PromotionRequest isolated PostgreSQL integrations, Research Automation 138 unit tests, Platform 58 unit tests, the submit coordinator's random-database HTTP smoke, and Web build/test. The final V3.1 suite also exercised the owner-session Platform proxy.
- The enhanced V3.2 random-database HTTP smoke exited 0. It created and dropped a random temporary PostgreSQL database and used temporary mock Platform/Quant endpoints. A `NOT_RUN` gate produced `WAITING` with zero Quant requests. A synthetic `ACCEPTED` gate allowed one mock submission; the second request replayed persisted success without another Quant call. It also retained the prior checks for immutable preparation, UNKNOWN restart recovery, and successful journal replay.
- The smoke's accepted gate and Quant response are synthetic test fixtures. They do not represent user acceptance, a live model run, real validation, or Registry approval. No production Quant service or Registry was called.
- The Platform integration smoke also verified the user-session proxy returns `WAITING` when Research Automation lacks a matching persisted experiment, records `humanAcceptance=NOT_CHANGED`, and leaves the exact-run acceptance intact. Temporary Platform/Research processes and synthetic database records were removed.
- Final `pnpm baseline:check` passed with 797 Markdown links, 109 JSON files, 59 schemas, 34 fixtures, 46 compatibility rules, and 10 OpenAPI groups. Compose configuration and `git diff --check` passed.
- Six focused V3.1/V3.2 Playwright tests passed using intercepted synthetic API responses. During an earlier, incorrectly broad Playwright invocation, a legacy page test reached the configured V3.1 service and received `422 stage budget exhausted`; whether this reflected a pre-existing or test-induced budget state is unknown. No query or cleanup was performed against that potentially shared persistence. The affected page test now mocks its API and cannot consume service budget.

## Status and limits

The formal owner-session Web actions are present, but the current V3.1 normal workflow is still prerequisite-only and does not emit the required LIVE-model and completed-Runner evidence, so no real run can pass the new gate yet. V3.1 and V3.2 business scenarios, actual model/RD-Agent execution, manual exact-run acceptance, independent validation, and release acceptance remain `NOT_RUN`.
