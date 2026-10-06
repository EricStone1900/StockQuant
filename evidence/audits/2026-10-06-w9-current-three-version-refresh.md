# W9 current three-version gate refresh (2026-10-06 16:42 Asia/Shanghai)

The formal verifier and evidence verifier were rerun read-only for all three versions after the V2.2 runbook update. Every evidence gate passed with no missing references or hash failures. Stage-document audits passed, and acceptance tables had no missing or unexpected IDs. The formal version gates all returned exit 2/`INCOMPLETE`:

| Version | Formal gate | Unresolved stages | Evidence references / manifests / active entries |
|---|---|---|---|
| V1 | `INCOMPLETE` | V1.1–V1.5 (5) | 98 / 13 / 39 |
| V2 | `INCOMPLETE` | V2.1–V2.5 (5) | 324 / 53 / 137 |
| V3 | `INCOMPLETE` | V3.1–V3.4 (4) | 389 / 59 / 130 |

There are no missing or unexpected acceptance-table rows. The gates still report unresolved stage/run evidence and acceptance requirements; green code suites and evidence hashes do not substitute for applicable real-data observation, Ubuntu migration, or current human sign-off. Full machine results are in the adjacent `*-version-gate.json` and `*-evidence-gate.json` files. The V2 result continues to identify six missing historical structured TestRun exports for V2.1/V2.2.
