# W9 three-version gates after W7 100k Runner capacity sample

Date: 2026-10-02 (Asia/Shanghai)

Commands: `node scripts/verify-version.mjs --version V1`, `V2`, and `V3`. Each command returned exit 2, as required while its acceptance gates remain incomplete. Machine outputs were retained at `/tmp/stockquant-w9-V1.json`, `/tmp/stockquant-w9-V2.json`, and `/tmp/stockquant-w9-V3.json` for this local execution; the summarized decision is recorded here.

| Version | Gate | Stage documentation | Evidence references / manifests / entries | TestRun evidence |
|---|---|---|---:|---|
| V1 | INCOMPLETE | PASS, 5 stages | 48 / 8 / 9; failures 0 | INCOMPLETE; 17 historical associations unresolved |
| V2 | INCOMPLETE | PASS, 5 stages | 152 / 24 / 38; failures 0 | INCOMPLETE; 9 IDs checked, 6 structured exports missing |
| V3 | INCOMPLETE | PASS, 4 stages | 159 / 34 / 37; failures 0 | NOT_RUN; zero bound TestRuns |

All versions reported zero invalid PASS claims, missing acceptance rows, or unexpected acceptance rows. V1 and V2 historical TestRun associations cannot be recovered from current Git contents; do not fabricate exports or bind unrelated runs. V3.1–V3.4 remain `NOT_RUN` at the stage acceptance level despite engineering slices and the new W7 100k synthetic Runner sample. No human acceptance or Ubuntu validation was inferred. V2 remains NO_TRADE and has no market-source authorization; this audit and the W7 run made no market/provider/Paper calls.

The checks establish documentation/reference integrity only. They do not establish end-to-end business behavior, deployment, real observation, or sign-off.

After adding the 100k repeat-variance evidence links to the V3.3 stage record, the V3 gate was rerun: still exit 2/INCOMPLETE, stage documentation PASS, evidence audit PASS with 153 references, 31 manifests, 34 entries, and no invalid PASS/missing/unexpected acceptance rows. V3.1–V3.4 remain NOT_RUN at the stage acceptance level. The repeat run details are in [the repeat-variance audit](2026-10-02-w7-v33-runner-100k-repeat-variance.md) and [its SHA-256](2026-10-02-w7-v33-runner-100k-repeat-variance.sha256).

After adding the PostgreSQL single-slot backpressure evidence links to the V3.3 stage record, V3 was rerun: exit 2/INCOMPLETE, stage documentation PASS and evidence audit PASS with 155 references, 32 manifests, 35 entries, and zero integrity failures; invalid PASS/missing/unexpected acceptance rows remain 0, and testRun evidence remains NOT_RUN.

After adding the running-Runner cancellation/recovery evidence to V3.3, the V3 gate was rerun: exit 2/INCOMPLETE, documentation PASS, evidence audit PASS with 157 references, 33 manifests, 36 entries, zero integrity failures, and zero invalid PASS/missing/unexpected acceptance rows. Stage TestRun evidence remains NOT_RUN.

After adding the fixed Runner failure-matrix evidence to the V3.3 stage file, the V3 gate was rerun: exit 2/INCOMPLETE, documentation PASS and evidence audit PASS with 159 references, 34 manifests, 37 entries; zero evidence failures, invalid PASS claims, missing acceptance rows or unexpected acceptance rows. Stage acceptance remains NOT_RUN.
