# V1.5 paired volume backup and restore E2E

Status: **PASS**
Project: `sq-v15-e2e-c1d77296feb8a98d1eb8`

TestRuns:
- normal: `2dd7993a-5bf3-4809-b434-4308f432ad94`
- rejection: `e3579605-1c56-49e9-8a16-f699d2eb373c`
- recovery: `70cd0fab-b758-466d-8aa8-2709d111a73f`

Browser exit code: 0; external source calls: 0; real broker calls: 0; exact project cleanup: True.

Restored Run `2dd7993a-5bf3-4809-b434-4308f432ad94` retained `V1.5-HOLD-002=PASS` with 120 authoritative observations. Overall check-only returned 2/WAITING because the V1.5 version gate still has an unimplemented automatic-trading assertion. Temporal `v15-no-trade-2dd7993a-5bf3-4809-b434-4308f432ad94` remained COMPLETED; restored JetStream ackFloor/delivered were 1/1.

Volume archive snapshots:
- `v14-integration-postgres`: 146025472 bytes, SHA-256 `14b147c7be673088da805dd5cecf2bf2535417c72c84b0c6ef4dc151b08a2b09`.
- `nats-jetstream`: 29184 bytes, SHA-256 `480cc9fff7b9b6dd9bc253f091ef0583266f19d05b6c0900cd13ba4adde243fc`.
- `temporal-dev-state`: 919552 bytes, SHA-256 `20c6c3888dcdd7d5916078234dc719de68716d552575e5ab8849b899dfd91b08`.

This proves the V1.5 isolated PostgreSQL cluster, NATS JetStream, and Temporal SQLite volumes only. No external Artifact volume was created by this V1.5 workflow; it does not prove the V1.1–V1.4 Artifact-volume backup, Ubuntu, off-host replication, RPO/RTO, or host/volume disaster recovery.

Machine report and current source hashes: [JSON](./2026-10-07-v15-paired-backup-restore-e2e.json).
