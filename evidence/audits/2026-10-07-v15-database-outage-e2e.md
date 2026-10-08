# V1.5 PostgreSQL process outage and recovery E2E

Status: **PASS**

Isolated project: `sq-v15-e2e-87dbe4eb98591434a798`
Normal TestRun: `79e95683-4027-4f6d-bcfa-e82d5698aaa9`

The isolated PostgreSQL container process was killed immediately after JetStream delivered sequence 1, then the same container and volume were restarted and readiness was confirmed. Platform logged a repository retry and NAK, JetStream redelivered the same sequence, and the original Run completed all 120 authoritative observations. The normal, rejection, and recovery browser scenarios passed; same-Run CLI/export checks passed; external market-source and real-broker calls were both zero; exact project cleanup passed.

This validates process-level recovery in a disposable V1.5 Compose stack. It does not validate host/volume loss, backup restoration, production failover, trading, or end-of-day reconciliation.

Fault timeline:
- `normal_test_run_created` at `2026-10-07T12:04:01.696Z`; TestRun `79e95683-4027-4f6d-bcfa-e82d5698aaa9`.
- `isolated_postgres_server_process_terminated_after_jetstream_delivery` at `2026-10-07T12:04:01.915Z`; TestRun `79e95683-4027-4f6d-bcfa-e82d5698aaa9`.
- `same_isolated_postgres_server_restarted_and_ready` at `2026-10-07T12:04:07.593Z`; TestRun `79e95683-4027-4f6d-bcfa-e82d5698aaa9`.
- `normal_run_completed_after_postgres_server_recovery` at `2026-10-07T12:04:17.743Z`; TestRun `79e95683-4027-4f6d-bcfa-e82d5698aaa9`.
- `postgres_server_outage_nak_same_sequence_redelivery_and_same_run_completed` at `2026-10-07T12:04:20.149Z`; TestRun `79e95683-4027-4f6d-bcfa-e82d5698aaa9`.

Source SHA-256 values are recorded in the adjacent machine JSON.
