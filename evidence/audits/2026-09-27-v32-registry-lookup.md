# V3.2 exact approved Registry lookup

Date: 2026-09-27 (Asia/Shanghai)

## Change

Quant Research now provides `GET /v1/registry/versions/{versionFingerprint}` for the Platform API service only. The lookup requires an exact 64-character SHA-256 fingerprint and returns the immutable approved candidate artifact identity plus code, data-manifest, metrics-manifest, and validation-plan hashes. It also returns the approver and fixed `CANDIDATE_APPROVED` / `DISABLED_UNTIL_MANDATE` state. Unknown fingerprints return 404; malformed fingerprints and non-Platform service identities are denied. The route is read-only and cannot activate or mutate a candidate.

Added a versioned response schema, OpenAPI operation, compatibility rule, generated types, and explicit service-auth scope test. The isolated Quant PostgreSQL/HTTP integration now approves its synthetic exact version, reads it back through the fingerprint endpoint, compares the candidate artifact and fingerprint, verifies disabled state, checks an unknown fingerprint returns 404, and checks the Research Automation token receives 403.

## Verification

- `pnpm --filter @stockquant/quant-research-service test` — PASS; 45 TypeScript tests and 12 Python Worker boundary tests.
- `pnpm --filter @stockquant/quant-research-service build` — PASS.
- `pnpm --filter @stockquant/quant-research-service test:integration` — PASS; candidate registration and exact PromotionRequest/report/decision/Registry lookup use random disposable PostgreSQL databases and loopback HTTP.
- `pnpm contracts:check` — PASS; 115 JSON files, 65 schemas, 34 Fixtures, 52 compatibility rules, 7 Quant promotion operations.
- `pnpm verify:stage -- --stage V3.2 --suite code` — PASS on the approved local loopback environment; includes the checks above, Quant fixture recomputation and random-PG/HTTP tests, Research Automation 138 unit tests/build and guarded-submit smoke, Platform 62 unit tests/build, and Web typecheck/build/unit test. Final classification remains `businessValidation: NOT_RUN`, `activeRegistryMutation: NOT_PERFORMED`, `isolatedSyntheticRegistryMutation: PERFORMED_IN_DISPOSABLE_TEST_DATABASE`, `humanAcceptance: NOT_RUN`.
- `git diff --check` — PASS.

## Boundary

The approval, candidate, and approver used by the integration test are synthetic and exist only in a random disposable database, which the test drops. No active Registry, Mandate, Paper account, or real candidate was read or changed. The endpoint enables a downstream exact-version lookup, but Mandate/Paper does not yet consume it; no mandate was created or activated. Persisted real-candidate recomputation, V3.1 prerequisite evidence, V3.2 TestRun/evidence export, business validation, and human acceptance remain `NOT_RUN`.
