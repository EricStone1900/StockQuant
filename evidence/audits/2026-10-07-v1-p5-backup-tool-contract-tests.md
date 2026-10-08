# V1 P5 backup-tool contract tests

The current cluster-backup, scheduled-backup and retention unit suites passed 16/16 tests: cluster backup 5/5, scheduling/quiescence 8/8, and retention 3/3. Full output: [log](./2026-10-07-v1-p5-backup-tool-contract-tests.log). Machine report and current source hashes: [JSON](./2026-10-07-v1-p5-backup-tool-contract-tests.json).

These tests cover tool contracts and fail-closed behavior only. They do not capture or restore V1's PostgreSQL domains, FakeBroker, NATS JetStream, Temporal state or Artifact volume, and do not exercise the target Ubuntu host. P5 backup/restore remains incomplete.
