# W9 current baseline rerun

Date: 2026-10-02 (Asia/Shanghai)

## Commands and results

- `pnpm baseline:check`: PASS (exit 0). Markdown links: 2,417 with no failures; 214 JSON files validated (148 schemas, 36 fixtures); contract generation/compatibility, Artifact content-store tests (4/4), eight service-layer checks, and 26 architecture/version-gate tests passed.
- `pnpm verify:version:evidence -- --version V1|V2|V3`: PASS (exit 0 for each version). Linked evidence and manifests have no missing files or hash failures.
- `pnpm verify:version -- --version V1|V2|V3`: INCOMPLETE (exit 2 for each version). No invalid PASS claims or acceptance-row mismatches were reported. V1/V2 retain unresolved legacy TestRun associations; V3 stage-level business TestRuns remain NOT_RUN. The gates correctly distinguish evidence-reference integrity from stage acceptance.
- `pnpm audit:legacy-testruns`: 78 local evidence JSON files scanned; 18 exact associations remain unresolved (12 V1, 6 V2); no exact payload match was found.
- W0 and V1.4 recovery SHA-256 manifests verified successfully.

The invocation `pnpm verify:version:evidence` without a `--version` argument was also tried and returned usage/exit 2; this was a command-usage error, not a project verification failure. The version-specific invocations above are authoritative.

## Boundary

No source authorization, collection, Paper activation, external provider call, business scenario, database write, or human sign-off was performed. NO_TRADE and no-source authorization remain in force. W9 local verification is current; this does not complete W9 because the external evidence, observation, Ubuntu, and actual user-acceptance gates remain open.
