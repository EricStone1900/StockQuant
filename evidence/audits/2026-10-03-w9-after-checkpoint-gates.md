# W9 version gates after W7 checkpoint slice

Date: 2026-10-03. Commands: `node scripts/verify-version.mjs --version V1|V2|V3` after the final W7 V3.3 code suite and baseline check.

## Results

- Baseline: PASS (full log: [baseline](./2026-10-03-w7-checkpoint-baseline.log)).
- V1: exit 1 / FAIL. All five stages remain unresolved. Evidence audit found four hash mismatches in the 2026-10-03 shared-contracts/round-runner point-in-time manifest, including later-edited Research source and generated shared types.
- V2: exit 2 / INCOMPLETE. All five stages remain unresolved; evidence audit PASS (255 references, 42 manifests, 267 entries, zero hash/reference failures).
- V3: exit 1 / FAIL. All four stages remain NOT_RUN. Evidence audit found nine mismatches across prior point-in-time source manifests for Research bootstrap/generated contracts and a previously captured architecture file.

This is the initial gate snapshot before the current-source pointer refresh; its compact result is preserved in [initial failure summary](./2026-10-03-w9-after-checkpoint-initial-failures.json). The per-version gate JSON paths were subsequently refreshed to the final run. Historical manifests were retained and not rewritten. Current results are recorded in [final W9 report](./2026-10-03-w9-after-checkpoint-final.md).
