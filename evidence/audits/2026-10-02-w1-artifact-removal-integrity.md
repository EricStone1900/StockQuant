# W1 shared Artifact removal integrity audit

Date: 2026-10-02 (Asia/Shanghai)

## Change

`@stockquant/artifact-content-store` removal now verifies the addressed path is a regular file and that its current bytes still match the address SHA-256 before unlinking. Removing an absent file is idempotent. Corrupted bytes and a symlink at the addressed path are retained and reported as errors. The declaration documents this behavior.

## Verification

- `node --test packages/artifact-content-store/index.test.mjs`: PASS, 4/4.
- `git diff --check`: PASS.
- Tests use isolated temporary directories; no active service or shared Artifact volume was accessed.

## Boundary

This is a deletion integrity guard only. It does not authorize retention periods, verify metadata reference counts, coordinate concurrent readers/writers, create a cleanup schedule or audit ledger, or prove deployment/cutover/rollback. Lifecycle owners must establish expiry and reference safety before calling `remove`.
