# V3.2 exact candidate to Governance Mandate binding

Date: 2026-09-27 (Asia/Shanghai)

## Change

Added an owner-session Platform route for a read-only candidate-to-Mandate binding assessment. Platform requires the signed-in owner to match the submitted owner, the exact TestRun to be an owned normal V3.1 run, and that run's persisted gate to be `PASS` plus `ACCEPTED`. It then forwards the bounded, strict-schema command to Governance.

Governance accepts this request only from Platform's independent Bearer identity. It queries Quant directly using a separate `decision-governance-service` Bearer credential scoped only to `GET /v1/registry/versions/{fingerprint}`. Governance returns `EXACT_VERSION_MATCH_READY_FOR_MANDATE_REVIEW` only when the exact fingerprint resolves to an approved Registry version and candidate Artifact ID, namespace, and SHA-256 all match. A missing version or mismatched Artifact is rejected; registry/credential/network unavailability returns `WAITING`/503. A match keeps the Registry version at `DISABLED_UNTIL_MANDATE`. The route persists nothing, creates no Mandate, and cannot issue execution authorization.

Added versioned request/result schemas, compatibility rules, OpenAPI operations for Platform and Governance, service identity scopes, Compose wiring, and domain/Platform unit coverage. Quant's random disposable PostgreSQL/HTTP integration now starts the real Governance service against the isolated Quant service and exercises exact match, candidate hash mismatch, unknown fingerprint and wrong caller. The V3.2 page now lets an owner request this binding check for an approved version, and explicitly displays that account validation and Mandate persistence were not performed and activation remains disabled. `pnpm test:e2e -- --stage V3.2` is now a supported stage entry and passes all 4 mocked API Chromium flows, including the binding action.

The Quant PG/HTTP smoke no longer supplies hand-written PASS descriptions. It loads and verifies the frozen synthetic Manifest and files, recomputes PIT/OOS/cost/rules/capacity from the fixed SMA candidate description and daily bars, builds the report against a newly generated PromotionRequest ID/TestRun/Experiment ID and hashes for the exact candidate/code/data/metrics/plan, then persists it and compares the retrieved report and all evidence objects byte-for-byte. The integration harness uses a synthetic `quant-validation-worker` credential to submit that locally computed report; it does not run a deployed validation-worker process. The same isolated flow approves the exact synthetic version, resolves it from Governance over real loopback HTTP, and tests wrong Artifact and unknown fingerprint rejection. The stage suite separately runs the read-only Linux/AMD64 standard-library cross-runtime recomputation check. Neither path executes candidate-provided code or Qlib.

## Verification

- `pnpm verify:stage -- --stage V3.2 --suite code` — PASS. Includes Quant (46 TypeScript, 12 Worker tests, build, isolated PG/HTTP integrations), Governance (build, 9 tests), Research Automation (138 tests/build/guarded-submit smoke), Platform (64 tests/build), Web typecheck/build/unit, contracts and Fixtures.
- `pnpm test:e2e -- --stage V3.2` with local Vite/Chromium — PASS, 4/4. The new binding UI test checks the session-derived owner, exact source run, approved fingerprint and Artifact request payload, then checks the page preserves `accountValidation=NOT_PERFORMED`, `mandatePersistence=NOT_PERFORMED`, and `DISABLED_UNTIL_MANDATE`.
- The cross-service smoke reports `real Governance HTTP -> Quant Registry HTTP`; exact approved fingerprint/Artifact match is returned for review only, wrong Artifact and unknown fingerprint return 422, and Replay identity returns 403.
- The random-DB Quant smoke reports all five fixed-fixture gates (`PIT`, `OUT_OF_SAMPLE`, `COST`, `RULES`, `CAPACITY`) as PASS and asserts the persisted report/evidence and all five bound hashes match the actual recomputation output; the fixture remains explicitly `FIXTURE`/synthetic.
- Contract check: 118 JSON files, 67 schemas, 34 Fixtures, 54 compatibility rules; Quant Promotion OpenAPI has 7 operations, Governance binding OpenAPI 1 operation, Platform V3.2 OpenAPI 4 operations.
- All test rows and synthetic approvals are in a random disposable PostgreSQL database dropped by the smoke. `activeRegistryMutation=NOT_PERFORMED`; stage output retains `businessValidation=NOT_RUN` and `humanAcceptance=NOT_RUN`.

## Boundary

This is a readiness/binding check only. It does not persist mandate approval, activate a strategy, change Paper execution authorization, or submit orders. No actual user strategy, securities, limits, account, or mandate was authorized. Real candidate validation, an accepted real V3.1 run, V3.2 TestRun/evidence export, Paper consumption and human acceptance remain outstanding.
