# W9 version gates after the O1/O2 read-only refresh

Date: 2026-10-03 (Asia/Shanghai). After refreshing the O1/O2 status and repairing the current V2.4 snapshot reference to point at the new W0 snapshot, all three version evidence audits were rerun.

| Version | `verify:version` | Unresolved stages / acceptance rows | Evidence audit | References / manifests / entries |
|---|---:|---:|---|---:|
| V1 | exit 2, `INCOMPLETE` | 5 / 5 | PASS | 82 / 10 / 43 |
| V2 | exit 2, `INCOMPLETE` | 5 / 5 | PASS | 212 / 34 / 6,536 |
| V3 | exit 2, `INCOMPLETE` | 4 / 4 | PASS | 186 / 39 / 69 |

All versions reported zero missing or unexpected Acceptance IDs and zero evidence audit failures. The V2 manifest count rose as dated O1/O2, W8, and W9 records plus the regenerated W0 snapshot entered the snapshot; V3 gained the linked W8 audit reference. An intermediate check correctly exposed that an older W0 SHA manifest no longer matched edited documents; historical snapshots were retained, current stage references were advanced to the latest snapshot, and the new snapshot excludes its own report and manifest. Evidence audit then passed for all versions. The final counts above were rechecked after all records were present.

These are evidence-integrity and status-gate results only. They do not resolve the V1/V2/V3 business gates, the 12 remaining O1 observation days, market-source authorization, Ubuntu observation, or user acceptance. Machine-readable summaries are in the [JSON report](./2026-10-03-w9-after-o1-readonly.json), with source files bound by the [SHA-256 manifest](./2026-10-03-w9-after-o1-readonly.sha256).
