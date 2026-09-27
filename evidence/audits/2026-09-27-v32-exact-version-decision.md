# V3.2 exact-version approval and rejection boundary

Date: 2026-09-27 (Asia/Shanghai)

## Implemented boundary

Quant now persists one immutable decision per PromotionRequest in a transaction that locks the immutable request and validation report. The command pins the report's stored SHA-256; Quant checks the report's PromotionRequest, source TestRun, and source mode against the immutable request. APPROVE requires `ELIGIBLE_FOR_REVIEW` and all five required checks PASS. APPROVE/REJECT is immutable: exact replay is idempotent; a changed decision, actor, or report fingerprint returns conflict. A stale fingerprint cannot create a Registry version. Quant detail status is derived from persisted facts (`AWAITING_REVIEW`, `VALIDATION_INCOMPLETE`, `REJECTED`, or `CANDIDATE_APPROVED`) while the intake row remains immutable.

Approval creates a `promotion_registry_versions` row whose unique `versionFingerprint` binds the PromotionRequest fingerprint, report fingerprint, candidate Artifact, code, data manifest, metrics manifest, and validation plan. The Registry fact is `CANDIDATE_APPROVED`; activation remains `DISABLED_UNTIL_MANDATE`. A changed request or report produces a different fingerprint and cannot reuse the old approval. This preserves old versions as history; downstream Mandate and Paper consumers still need to prove they compare the exact fingerprint before authorizing any simulation.

The Platform endpoint requires a local session, reads the immutable request/report, confirms that the caller owns the normal V3.1 source TestRun and that the exact run has both gate PASS and persisted human ACCEPTED, then supplies the actor identity and report fingerprint to Quant using the Platform Bearer. V3.2 evidence reads now verify ownership of the normal V3.1 source TestRun as well. The Web page displays explicit APPROVE/REJECT actions only when a persisted report is present; APPROVE appears only for an eligible report. It states that a recorded approval does not activate the strategy.

## Verification

- `services/quant-research-service/scripts/test-promotion-request.mjs` passed against a random disposable PostgreSQL database and temporary local HTTP process. It verified an immutable all-PASS synthetic FIXTURE report, denied Research Automation and wrong-token decision writes, rejected stale report fingerprint, approved the exact version once, replayed the same decision idempotently, rejected a conflicting rejection, re-read the decision, and confirmed all request/code/data/metrics/plan hashes plus `DISABLED_UNTIL_MANDATE` in the Registry row. The database was dropped in the script's `finally` block. The fixture report and actor are synthetic; this is transaction/identity behavior evidence only.
- Quant's exact-version parser/fingerprint/report-eligibility tests passed 4/4; Quant typecheck passed.
- `pnpm verify:stage -- --stage V3.2 --suite code` exited 0 after the decision implementation. It included contracts/Fixtures, Quant 44 TypeScript and 12 Python tests plus both random-database HTTP integrations, Research Automation 138 tests and the guarded-submit smoke, Platform build and 62 unit tests, and Web typecheck/build/1 unit test. The stage summary reports active Registry mutation `NOT_PERFORMED`, isolated synthetic Registry mutation `PERFORMED_IN_DISPOSABLE_TEST_DATABASE`, and business validation/human acceptance `NOT_RUN`.
- The Platform V3.2 acceptance tests covered owner-session forwarding, accepted-gate and report binding, refusal before forwarding when human acceptance is absent, and denial of another owner's read. Three focused mocked-API V3.2 Playwright tests passed.
- Three V3.2 Playwright tests passed with all API responses intercepted: read-only missing-report state, guarded submit status, and explicit exact-version approval with the resulting disabled Registry state.
- Final baseline passed: 799 Markdown links, 114 JSON files, 64 schemas, 34 fixtures, 51 compatibility rules, six Quant Promotion API operations, and two Platform V3.2 actions. `git diff --check` passed.

## Status and limits

No active database, Registry, Mandate, model provider, or live service was called. The only Registry row was in the disposable integration database. The report used for this smoke was synthetic; the independent worker does not yet execute a persisted candidate against its bound frozen input and produce the report itself. V3.1 real-model/Runner prerequisites, downstream exact-fingerprint enforcement in Mandate/Paper, V3.2 TestRun scenario orchestration/evidence export, actual candidate decision, and user acceptance remain `NOT_RUN`. Approval keeps the version disabled and is not permission to create a Mandate or activate a strategy.
