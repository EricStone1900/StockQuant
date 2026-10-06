# W9 TestRun evidence binding gate — 2026-10-02

## Change

`verify:version` now audits exact UUIDs found in each acceptance evidence row against the stage-scoped structured export at `evidence/local/<stage>/<TestRun UUID>/evidence.json`. It verifies the export's stage/run identity, every path and SHA-256 in `manifest.sha256`, and (for any stage claiming PASS) a COMPLETED run with non-empty all-PASS assertions plus a dated user sign-off that names the same UUID. Missing legacy bundles are INCOMPLETE; malformed, mismatched, tampered, or unsafe evidence is FAIL. A version with no exact TestRun UUIDs reports NOT_RUN for this audit.

## Verification

- `node --test scripts/version-gate-test-run-evidence.test.mjs scripts/verify-version.test.mjs`: 8/8 PASS.
- `pnpm baseline:check`: PASS; 2,112 Markdown links, contracts and fixtures valid, 8 service-layer checks, 25 architecture/version-gate tests.
- V1 `verify:version`: exit 2 / INCOMPLETE; TestRun association audit INCOMPLETE, 17 UUIDs checked, 17 unresolved (legacy structured exports missing). Stage-document and evidence-reference audits PASS.
- V2 `verify:version`: exit 2 / INCOMPLETE; TestRun association audit INCOMPLETE, 9 UUIDs checked, 8 unresolved. Stage-document and evidence-reference audits PASS.
- V3 `verify:version`: exit 2 / INCOMPLETE; TestRun association audit NOT_RUN, 0 exact UUIDs in acceptance rows. Stage-document and evidence-reference audits PASS.
- `git diff --check`: PASS.

No historic evidence was rewritten or inferred as accepted. Missing bundles and pending human acceptance remain open; the version gate correctly stays incomplete.
