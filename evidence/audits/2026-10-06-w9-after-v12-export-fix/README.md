# W9 three-version gate refresh after V1.2 evidence-export repair

Date: 2026-10-06. The current version verifiers were rerun after fixing V1 evidence bundle stage paths and top-level run identity.

| Version | Verifier | Version status | Stage evidence audit | TestRun audit |
|---|---|---|---|---|
| V1 | exit 2 | INCOMPLETE; 5/5 stages unresolved | PASS (125 references, 14 active manifests, 69 hash entries; 6 historical snapshots skipped) | INCOMPLETE; 11 IDs, 7 unresolved, including unrecovered V1.2 historical run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4` and missing V1.3/V1.5 exports |
| V2 | exit 2 | INCOMPLETE; 5/5 stages unresolved | PASS (328 references, 52 active manifests, 130 hash entries; historical snapshots handled by links) | INCOMPLETE; 11 IDs, 6 unresolved historical V2.1/V2.2 exports |
| V3 | exit 2 | INCOMPLETE; 4/4 stages remain NOT_RUN | PASS (392 references, 58 active manifests, 120 hash entries) | PASS for the three referenced structured bundles; stage/business/manual acceptance remains incomplete |

Full verifier JSON: [V1](./version-v1.json), [V2](./version-v2.json), and [V3](./version-v3.json); [summary](./summary.json) records exit codes, statuses and sub-gate results. V1.2's newly exported TestRun `890f3fab-e689-471b-8c45-97abd531d3d5` now passes exact identity and manifest checks, but it does not replace the missing historical run. The pre-existing 2026-10-06 W9 search found no recoverable bundle for that historical UUID. Input and report hashes are listed in [checksums.sha256](./checksums.sha256).

A read-only query for the exact missing V1.2 UUID against the still-running Platform API returned 404 on both run and evidence routes; the evidence route says it was not found in the `acceptance-owner-1` user scope. This confirms it cannot be exported through the current local principal and active store endpoint; it does not claim all external backups were searched. No active service was changed.

These results do not change any historic or current user signature, source authorization, O1/O2 observation count, Ubuntu status, or version completion status. NO_TRADE remains active; no source, broker, Paper, or LIVE operation was performed.
