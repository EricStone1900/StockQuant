# W1 shared Artifact volume reconciliation scope

Date: 2026-10-01 (Asia/Shanghai). Result: PASS for source-level boundary correction and isolated unit tests.

## Finding

The shared content volume places Research Automation bytes at `research/{run}/{experiment}/{inputs|outputs}/{sha256}/{artifactId}` (with legacy files omitting the hash layer) and Platform Qlib bytes at `research/{testRunId}/qlib-fixture/{sha256}/{artifactId}`. The Research reconciler previously scanned every regular file beneath `research/`, constructed an identity from all parent directories, and classified files without a Research Automation DB ref as orphan candidates. Thus old, unreferenced Qlib files could enter the Research quarantine list. The explicit quarantine operation also did not independently validate that a candidate identity belonged to the Research namespace.

## Change

The scanner now recognizes only the V3.1-owned `research/{run}/{experiment}/{inputs|outputs}/{artifactId}` legacy layout and its SHA-addressed form. Other namespaces, including `qlib-fixture`, are outside its scan count and cannot become candidates. Hash-layered files must have content whose SHA-256 matches the directory address. Before a quarantine move, the operation reparses the candidate path and verifies the Research namespace, Artifact ID, address hash, file type, hash, size and modification timestamp. This preserves the existing no-symlink and same-filesystem quarantine controls.

## Verification

- `pnpm --filter @stockquant/research-automation-service exec vitest run tests/unit/v31-artifact-reconcile.spec.ts`: PASS, 5/5. Coverage includes legacy and content-addressed Research references, a Qlib file aged beyond the minimum threshold remaining untouched, hash mismatch, crafted Qlib quarantine candidate rejection, and existing path/symlink controls.
- `pnpm --filter @stockquant/research-automation-service build`: PASS.
- `pnpm --filter @stockquant/research-automation-service test`: PASS, 32 files / 180 tests.
- `activeServicesTouched=false`; no active volume was scanned, moved or rewritten. No quarantine/cleanup command was run.

## Limits

This fixes the reconciler's namespace boundary in code; it does not authorize retention duration, schedule physical deletion, validate the active volume's current contents, deploy the code, or complete Ubuntu, observation or user acceptance gates.

## Continuation note (2026-10-02)

The reconciler and its tests were extended with a fresh-reference check before quarantine. The linked source manifest now hashes their current contents so the version evidence verifier can distinguish valid follow-on code changes from tampering. The original 2026-10-01 source hashes remain preserved in [the 2026-10-02 W0 snapshot after the W1 Artifact cross-check](2026-10-02-w0-current-worktree-after-w1-v11-artifact-crosscheck.json). Current implementation and verification are detailed in [the stale-report guard audit](2026-10-02-w1-artifact-stale-report-guard.md).
