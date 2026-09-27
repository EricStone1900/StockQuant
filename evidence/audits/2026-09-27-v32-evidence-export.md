# V3.2 preparation evidence snapshot export (2026-09-27)

## Implemented behavior

`pnpm evidence:export -- --stage V3.2 --promotion-request <UUID>` now fetches the existing owner-scoped Platform detail route for a PromotionRequest. It requires the caller to supply `STOCKQUANT_EVIDENCE_SESSION_COOKIE`; it no longer sends a hard-coded user identity header. The response must bind the requested PromotionRequest UUID to the exact source V3.1 TestRun UUID and carry the expected immutable-boundary facts (`registryMutation=NOT_PERFORMED`, `activation=DISABLED_UNTIL_MANDATE`).

The exporter writes `evidence.json` and a SHA-256 `manifest.sha256` under `evidence/local/V3.2/<promotionRequestId>/`. It stages both files in a temporary sibling directory and renames that directory into place; if the target already exists, it refuses to overwrite it. The snapshot explicitly states `businessValidation=NOT_RUN` and `humanAcceptance=NOT_RUN`.

Existing TestRun exports now also require an explicit session cookie and validate run IDs before constructing output paths. The route mapping and legacy output path for those exports remain intact.

## Verification

- `node --test scripts/evidence-export.test.mjs`: 5/5 pure argument/contract tests pass.
- `node scripts/evidence-export-http-smoke.mjs`: PASS using a random local HTTP port and temporary output directory. It verifies owner cookie forwarding, exact request/run binding, digest over the emitted bytes, rejection of a wrong owner and mismatched PromotionRequest, no output on rejection, and refusal to overwrite an earlier export.
- `pnpm test:ops`: 102/102 passes in the restricted sandbox; the loopback smoke is intentionally separate from this generic unit suite.
- Full `pnpm verify:stage -- --stage V3.2 --suite code` includes both the pure tests and the explicit HTTP smoke and completed with exit 0 after the exporter integration was added. It reported `businessValidation=NOT_RUN`, `activeRegistryMutation=NOT_PERFORMED`, and `humanAcceptance=NOT_RUN`.
- `pnpm baseline:check` and `git diff --check` are required after the documentation update.

## Limits

No real owner PromotionRequest was exported during implementation. The smoke uses a mock owner-scoped API and synthetic IDs; it is not a deployed-service authorization test. This exports a preparation snapshot, not a V3.2 business TestRun or the formal stage evidence bundle. V3.2 business validation and human acceptance remain `NOT_RUN`, and no active Registry or Mandate is modified.
