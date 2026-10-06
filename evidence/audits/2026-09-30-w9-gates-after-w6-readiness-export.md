# W9 gates after W6 readiness TestRun export

On 2026-09-30, after adding the owner-scoped V3.2 readiness TestRun export, all three version gates were rerun against the current worktree. V1, V2 and V3 each returned `INCOMPLETE` with exit 2; unresolved stages are V1.1, V2.3/V2.4/V2.5, and V3.1–V3.4 respectively. All reported zero missing or unexpected acceptance IDs, while `uncheckedVersionGate=true` remains. This static summary is not acceptance evidence.

Evidence-reference checks returned PASS for V1 (16 refs), V2 (81 refs), and V3 (86 refs); seven linked manifests with seven entries were checked in aggregate, with no missing evidence or hash failures. The V3.2 readiness export does not change business validation, user acceptance, deployment, observation, or version status.

Machine-readable command/exit/status summary: [JSON](./2026-09-30-w9-gates-after-w6-readiness-export.json). No active services, DBs, scheduler, source or provider were contacted or changed.
