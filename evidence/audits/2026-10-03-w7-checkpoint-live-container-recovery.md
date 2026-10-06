# W7 Runner checkpoint live-container recovery

Date: 2026-10-03 (Asia/Shanghai)

## Change

The isolated Runner writes to `/run/output`, which is a bounded container tmpfs. The Host previously tried to read `checkpoint.json` only from its managed output directory; the regular output extractor copied files there only after execution ended. Thus the real container could not provide a checkpoint to the Host during a long-running job, despite the checkpoint database and Host loop tests passing.

The container executor now polls a bounded Python extractor while the named Runner container is running. It accepts only a regular, single-link checkpoint no larger than 256 KiB, reads it with `O_NOFOLLOW`, checks the file did not change during read, and validates the JSON envelope. Changed checkpoint bytes are atomically materialized in the fence-scoped Host output directory; the existing heartbeat then persists them through the Runner Host HTTP API. Regular artifact extraction excludes `checkpoint.json`, which has its own persistence path. The smoke's deterministic Fixture writes checkpoints through a temporary file followed by rename.

## Verification

- `pnpm --filter @stockquant/research-automation-service lint`: PASS.
- Runner executor and Host loop focused tests: 12/12 PASS.
- `pnpm --filter @stockquant/research-automation-service v33:runner-host-rounds-recovery-http-smoke`: PASS. TestRun `cac4d03f-9c34-4445-9098-2e57fb4a9789` persisted checkpoint sequence 1, killed Host 1 with SIGKILL, reclaimed the expired lease under fencing token 2, restored sequence 1, and persisted sequence 2 with state cursor 2 and SHA-256. The previous container was removed, published artifact hashes matched, and stale-fence publish returned 409. Resource limits were 500m CPU, 512 MiB, 30 seconds and 32 PIDs; 1,000 synthetic rows were used. Provider/model/market/Paper calls: 0.
- Full `pnpm verify:stage -- --stage V3.3 --suite code`: exit 0. Research Automation 216/216 unit tests and 29/29 PostgreSQL tests; Platform 169/169 unit tests and 6/6 PostgreSQL tests; Web Playwright 3/3. The suite's live-container checkpoint recovery smoke independently persisted sequence 1 and recovered/persisted sequence 2 for TestRun `667e6da8-0bb0-4482-a247-6bdd9ebaeb3c`. Capacity and queue/budget probes passed. Full log: [current V3.3 code suite](./2026-10-03-w7-v33-checkpoint-recovery-current-suite.log).
- Initial attempts are retained in task output: they exposed missing transfer from the tmpfs, a smoke cleanup foreign key ordering error, duplicate ordinary-output extraction of the checkpoint, and then a smoke-result variable scope error. Each was corrected; the successful standalone and full-suite runs include exact checkpoint sequence assertions and cleanup.

## Boundary

This closes the live-container transport and Fixture recovery validation subtask. It does not implement the V3.3 TestRun business workflow, real RD-Agent/model execution, Paper continuity, Ubuntu operation, provider billing reconciliation, or human acceptance. V3.3 remains `NOT_RUN`; `businessWorkflow=NOT_IMPLEMENTED`, `paperContinuity=NOT_CHECKED`, `businessValidation=NOT_RUN`, and `humanAcceptance=NOT_RUN`. No active service or observation state was changed.
