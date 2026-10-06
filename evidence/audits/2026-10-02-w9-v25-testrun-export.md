# W9 V2.5 TestRun structured export recovery

Date: 2026-10-02

## Scope and method

The active Platform API was accessed only through its loopback HTTP interface. The exact V2.5 acceptance UUIDs already recorded in the version acceptance table were checked against `acceptance_stage_runs` using read-only queries that returned only UUID, stage, scenario, status, and assertion count/status. No financial, order, or account details were queried. Each exact UUID was then passed to `pnpm verify:stage -- --stage V2.5 --run <UUID> --check-only`; no scenario was re-executed.

## Results

| Scenario | TestRun UUID | Stored status | Assertions | Check-only |
| --- | --- | --- | ---: | --- |
| normal | `e033c817-d521-40a8-892c-3c5b8098ea4c` | COMPLETED | 6/6 PASS | exit 0 |
| rejection | `17057748-135a-4337-a726-e654f97ed565` | COMPLETED | 3/3 PASS | exit 0 |
| recovery | `d3fefb85-2fb9-42c2-9cc1-adefba08af77` | COMPLETED | 3/3 PASS | exit 0 |

The rejection and recovery records were missing structured local exports, so the official `pnpm evidence:export` path was used to save their canonical flat evidence-export v2 responses and SHA-256 manifests. The existing normal export was retained. All three now pass the exact UUID, stage, manifest, completion, and assertion association audit. `pnpm verify:version:evidence -- --version V2` passes, including 152 linked evidence references and 24 manifests / 38 entries.

The version gate previously only understood a nested `evidence.run` envelope. Canonical flat exports were valid API outputs but could not satisfy the gate. It now accepts either canonical flat TestRun exports or the prior nested envelope, and targeted tests pass 9/9. This changes evidence parsing only; the already exported run facts are unchanged.

## Remaining status and boundaries

V2 TestRun association audit now passes for V2.3, V2.4, and all three V2.5 runs; six older V2.1/V2.2 UUIDs still lack structured exports. V1 has 17 unresolved exact UUID exports. V3 has no exact TestRun UUIDs and remains NOT_RUN. All three overall version gates remain INCOMPLETE; no business stage or human sign-off is inferred by this audit. No scenario was executed, no business database was written, no active service was restarted, and no external market source was contacted. NO_TRADE and no-source-authorization remain in force.
