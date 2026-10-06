# W7 durable Runner checkpoint infrastructure slice

Date: 2026-10-03

## Implemented

- Added versioned checkpoint command/result schemas and Runner Host OpenAPI persist/read operations with generated client methods.
- Added canonical JSON hashing and validation for TestRun, round, sequence, JSON-only state and 256 KiB maximum state size.
- Added PostgreSQL append-only checkpoint storage. Replays are idempotent only for the same sequence and state hash; stale, skipped or conflicting sequences are rejected.
- Bound service writes to the experiment's TestRun and allocated rounds. Host reads the latest checkpoint and verifies identity and state hash before materializing it as input. During heartbeats, the Host persists an output checkpoint file when present.

## Verification

- `pnpm --filter @stockquant/research-automation-service lint`: PASS (TypeScript no-emit).
- `pnpm --filter @stockquant/research-automation-service exec vitest run tests/unit/research-checkpoint.spec.ts tests/unit/v31-runner-host-loop.spec.ts`: PASS, 8/8.
- Full research service unit suite: 198 passed, 5 failed because sandbox denied loopback binding (`listen EPERM: operation not permitted 127.0.0.1`) in restricted egress proxy tests. This result is retained; no claim of full-suite pass.
- With approved local loopback execution, the full Research unit suite first passed 206/206, then 207/207 after adding a Runner Host checkpoint restore-and-save test.
- Package has no `typecheck` script; the attempted command returned `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`.
- The initial `pnpm baseline:check` failed because generated Research-only schema types had also changed Platform and Quant Research generated files, invalidating historical V2.3 source hashes. Updated the generator to emit those three checkpoint types only to the shared generated package and Research Automation; this restored the unrelated service hashes. The final baseline passed, including all 26 tests. See [final baseline log](./2026-10-03-w7-checkpoint-baseline.log).
- Initial full V3.3 code suite exposed the PostgreSQL `BIGINT`-as-string mapping defect in the new integration case. After normalizing that database value to a number and adding the Runner Host restore-and-save unit test, the final controlled suite exited 0: Research unit 207/207, Research PostgreSQL integration 29/29, Platform PostgreSQL integration 6/6, Web E2E 3/3, budget/capacity probes, and fixed two-round Runner recovery passed. Its scope report still states `businessWorkflow=NOT_IMPLEMENTED`, `paperContinuity=NOT_CHECKED`, `businessValidation=NOT_RUN`, and `humanAcceptance=NOT_RUN`.
- Full suite log: [2026-10-03-w7-checkpoint-v33-suite.log](./2026-10-03-w7-checkpoint-v33-suite.log).
- Real RD-Agent checkpoint use, service deployment and human acceptance: NOT_RUN.

## Boundary

This is a durable checkpoint transport/recovery infrastructure slice only. It does not implement the V3.3 TestRun business workflow, round orchestration, real model/provider execution, Paper continuity, Ubuntu operation, or stage acceptance. Market data and trading activity remained unauthorized; no provider, market, broker or Paper calls were made.
