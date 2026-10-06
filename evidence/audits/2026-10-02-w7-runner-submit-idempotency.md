# W7 Runner submit idempotency

Date: 2026-10-02 (Asia/Shanghai)

## Change

Runner submission now has an atomic create-if-absent store operation. PostgreSQL uses `INSERT ... ON CONFLICT DO NOTHING RETURNING` and reads the existing record on conflict, so a duplicate identity cannot reset its status, attempt, lease, execution, or artifact state. The coordinator compares canonical immutable job payloads: identical resubmissions return the original job, while reuse of a `(testRunId, experimentId)` identity with a different payload is rejected and exposed as HTTP 409.

The in-memory adapter implements the same API. Tests cover changed-payload conflicts under concurrent submission and PostgreSQL persistence. This does not close W7 experiment-round dispatch, TestRun budget orchestration, real RD-Agent/provider accounting, broader capacity/isolation, or Web acceptance.

## Verification

- Research Automation build: PASS.
- Research Automation lint: PASS.
- Research Automation unit suite: 34 files / 191 tests PASS.
- Isolated PostgreSQL integration suite: 4 files / 27 tests PASS, including concurrent same-identity/different-payload submission, immutable winner verification, same-payload idempotent replay, and altered-payload conflict.
- The PostgreSQL run used a temporary uniquely named Compose project, randomized credentials and host port. Its container, network, and volume were removed after the run.

## Retained non-passing attempt and limits

- The first integration run failed one new assertion because the modified TestRun fixture retained an artifact path under the previous TestRun namespace. The fixture was corrected to use a matching content-addressed path; the complete suite then passed. The failure is retained here and was not counted as a pass.

No market source or external Provider was contacted. No active service, database, Paper ledger, or production resource was touched or restarted. NO_TRADE remains in effect.
