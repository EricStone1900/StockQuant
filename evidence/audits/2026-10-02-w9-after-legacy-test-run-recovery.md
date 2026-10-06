# W9 version gates after legacy TestRun evidence recovery

Date: 2026-10-02 (Asia/Shanghai)

Recovered one exact V1.1 TestRun evidence bundle from its preserved legacy export. The original file hash matched its original manifest; the scoped v2 envelope and source copy now validate under the current gate. Its assertions are PASS, but its manual conclusion remains `NOT_RUN`. The other missing IDs were not reconstructed.

All release gates were rerun. V1, V2 and V3 remain `INCOMPLETE` with exit code 2. Stage documentation and linked-evidence audits pass: V1 49 references / 8 manifests / 9 entries; V2 170 / 28 / 53; V3 174 / 38 / 45. V1 historical evidence associations decreased from 17 to 16; V2 remains 6 unresolved from 10 IDs; V3.1–V3.4 remain `NOT_RUN`. Acceptance row shape is valid, with no duplicate, missing or unexpected rows.

A read-only query in a `READ ONLY` transaction against the active `platform_api` database found none of the 23 historical V1/V2 IDs. This says nothing about separate archived backups, but the repository scan found no other original payloads. No active row was modified or synthesized. NO_TRADE/no-source authorization remain in force; O1 is 8/20, with no new day counted. W8 remains an offline backup-contract pass only; no Ubuntu host migration or user acceptance has occurred.
