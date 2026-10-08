# V1.5 paired backup/restore E2E: first attempt failure

Date: 2026-10-07. The first run failed before the volume snapshot phase. The new backup/restore mode inherited the default NATS outage and lost-ACK injection, while its mode-specific configuration had disabled the expected ACK fault. The Web run therefore failed the harness assertion `Platform must have intentionally omitted the first dispatch ACK`; it did not reach backup or restore and is not counted as evidence.

Isolated project `sq-v15-e2e-d2fa8da5356d8f9824ab` was removed with its PostgreSQL/NATS/Temporal volumes and network. The failed machine record was saved at [JSON](./2026-10-07-v15-paired-backup-restore-e2e.json) until the retry produces the final report. The harness now bypasses all outage probes in backup/restore mode while preserving the normal browser workflow.
