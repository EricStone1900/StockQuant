# W7 Runner retry idempotency

Date: 2026-10-02 (Asia/Shanghai)

## Change

Retry creation now uses the same atomic `createIfAbsent` path as original Runner submission. Concurrent retry requests for one terminal attempt converge on one durable `retry-N` row; a late duplicate cannot overwrite that attempt after a worker claims it or starts recording its result. The coordinator verifies the stored retry points to the exact parent and attempt and retains the same immutable job payload.

This closes a queue persistence race. It does not complete the Experiment-to-round business workflow, checkpoint semantics, full W7 capacity envelope, Paper coexistence, or user acceptance.

## Verification

- Research Automation build and lint: PASS.
- Targeted Runner unit suite: 12/12 PASS; full Research Automation unit suite: 34 files / 191 tests PASS.
- Isolated PostgreSQL integration suite: 4 files / 27 tests PASS, including two concurrent retries converging to the same row, retry execution after claim, and preservation of the original terminal attempt and its output references.
- PostgreSQL used a uniquely labeled ephemeral `postgres:16.9-alpine` container with tmpfs storage and an automatically mapped loopback port. Container residual count after cleanup: 0. Active project services and databases were not used.

No market source or external Provider was contacted. NO_TRADE remains in force.
