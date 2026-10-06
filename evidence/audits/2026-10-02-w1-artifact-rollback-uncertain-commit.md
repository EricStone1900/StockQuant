# W1 / V3.1 Artifact rollback on uncertain commit

Date: 2026-10-02 (Asia/Shanghai)

## Change

Runner output publication persists shared-file bytes inside a PostgreSQL-backed transaction. If publication threw after a commit acknowledgement was lost, the old cleanup path converted a failed ArtifactRef lookup into `null` and could unlink bytes that were already referenced by a committed row. Rollback now removes bytes only after a successful authoritative lookup returns no reference. A failed lookup or failed removal preserves bytes for later reference-aware reconciliation and emits a structured warning. This does not enable retention expiry or general physical cleanup.

## Verification

- New focused rollback unit tests: 3/3 PASS (reference present, lookup uncertain, confirmed absent).
- Research Automation unit suite: 35 files / 194 tests PASS; integration suite: 4 files / 27 tests PASS.
- Research Automation build and typecheck: PASS.
- Full `pnpm verify:stage -- --stage V3.1 --suite code`: exit 0 using the current-worktree image `sha256:b1284722462e36ad840282058eea7f375c7d9d34da410a1550d148c7bfdc6410`. The suite included contracts, Research and Platform checks, Fixture chat/embedding accounting, and owner-scoped artifact HTTP/export. External Provider calls: 0; the owner-scope report states `activeServicesTouched=false`.
- The first full-suite attempt without an exact image digest exited 2 as designed. Both that failure and the successful pinned run are retained in `/tmp/stockquant-v31-artifact-rollback-suite.log` and `/tmp/stockquant-v31-artifact-rollback-pinned-suite.log` for this session.
- The unique temporary image tag was removed after the suite; no container remained based on that digest. Active application containers were not restarted or modified.

This is a publication-failure integrity fix within W1. OD-013 remains open; no default expiry, scheduler, or retention deletion was added. V3.1 business acceptance and human sign-off remain NOT_RUN.
