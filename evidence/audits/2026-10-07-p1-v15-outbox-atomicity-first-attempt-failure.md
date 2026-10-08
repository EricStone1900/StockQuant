# V1.5 Outbox atomicity test setup failure

Date: 2026-10-07 (Asia/Shanghai)

The first isolated PostgreSQL run of `test:v15-outbox-atomicity` failed while installing its injected CHECK constraint. The test used the same owner for the prior successful enqueue row and the rollback probe, so PostgreSQL correctly rejected adding a constraint that would also invalidate the existing row. The product transaction and rollback assertion were not reached in that attempt.

The test Fixture was corrected to use a distinct rollback owner. The rerun passed both success and injected Outbox-failure rollback cases against a disposable PostgreSQL database; the complete V1.5 code suite then exited 0. The initial failure is retained as test-setup history, not a product failure.
