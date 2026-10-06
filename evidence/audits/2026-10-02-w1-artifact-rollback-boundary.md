# W1 Research Artifact rollback boundary audit

Date: 2026-10-02 (Asia/Shanghai)

## Finding and change

The Research Artifact adapter's `remove(ref)` was used by failed Runner publication rollback. It removed bytes from the shared content-addressed path and also unlinked the legacy path assembled from the reference, without validating the legacy file's hash. A failed new publication with a colliding legacy artifact ID could therefore remove bytes that belong to an earlier artifact. The adapter now removes only the new shared content address. Legacy paths remain read-only during this migration.

## Verification

- Research Artifact store tests: 6/6 PASS, including shared-byte rollback while same-named legacy bytes remain unchanged.
- Research Automation unit suite: 32 files / 182 tests PASS.
- Research Automation `lint` and `build`: PASS.
- `STOCKQUANT_RESEARCH_IMAGE_ID=sha256:05a45830f2c15a7643f60ec2f0aa3c4a7250ffd761dabb0d07dbc30d0057ef53 pnpm verify:stage -- --stage V3.1 --suite code`: exit 0. The pinned Fixture model gateway used an internal-only network and recorded zero external Provider calls; Platform/Research isolated HTTP and PostgreSQL checks passed. The Artifact owner-scope smoke TestRun was `a13cdd49-1160-4ec6-9efc-2071fd4125b4`, and reported `activeServicesTouched=false`.
- Tests use temporary directories; no active volume or service was accessed.

## Remaining boundary

This fixes failed-publication rollback only. Legacy byte migration/retention, cross-service reference protection, expiry policy approval and scheduling, and active-volume cutover/rollback remain open.
