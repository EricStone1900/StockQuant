# V3.2 PromotionRequest contract preparation

Date: 2026-09-25 (Asia/Shanghai). This is a parallel contract-preparation slice; it does not mark V3.1 or V3.2 accepted.

Added `research/v3.2-promotion-request.schema.json` for the research-to-quant handoff. It binds a request/TestRun/experiment identity to an exact candidate Artifact and code, data-manifest, metrics-manifest and validation-plan SHA-256 values, plus the budget allocation/currency/reserved/consumed amounts and idempotency key. `candidateSource` distinguishes `RD_AGENT` from `FIXTURE`. Added a scenario-fixture schema and two deterministic fixtures: eligible for independent review and rejected for future-data leakage. Neither fixture asserts Registry activation or bypasses human approval.

Updated the compatibility matrix with the two contracts. Generated TypeScript and Python models; TypeScript output now also reaches the quant and research service source trees so both sides of this handoff can use the canonical types. PRD and both service architecture notes state the ownership rule: research submits; quant independently recomputes and owns Registry state. No service routes, database migration, validator, approval, Web page or TestRun scenario were implemented in this slice.

Verification: `pnpm contracts:check` passed: 53 JSON files, 30 schemas, 18 fixtures, 19 compatibility rules; OpenAPI check passed for Portfolio (4 operations) and V2.4 observation (1 operation). Quant service typecheck and research-automation service lint/typecheck passed. `pnpm docs:check` passed with 546 local Markdown links; `git diff --check` passed.

Regression verification: `pnpm verify:stage -- --stage V3.1 --suite code` completed with research-automation unit 76/76, isolated PostgreSQL integration 7/7, platform API unit 40/40 and Web typecheck passing after generated PromotionRequest types were added. The stage is still NOT_RUN as a business acceptance because this code suite does not execute real RD-Agent/model calls or user acceptance.

Remaining: V3.1 real RD-Agent prerequisite/acceptance; V3.2 independent Qlib recomputation, PIT/OOS/cost/rule/capacity validators, persistent PromotionRequest and quant-owned Registry transitions, exact-version user approval, Web and acceptance-center workflows, normal/rejection/recovery code and browser evidence, human sign-off. Until those exist the stage and version acceptance tables remain NOT_RUN.
