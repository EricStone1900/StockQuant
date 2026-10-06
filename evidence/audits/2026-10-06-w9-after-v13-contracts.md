# W9 three-version gate refresh after the V1.3 contract slice

Date: 2026-10-06. Re-ran the formal version gates after adding the V1.3 request/result schemas, owner-scoped OpenAPI contract, generated types and runtime request validation, and after explicitly labeling superseded source manifests as historical execution snapshots.

V1, V2 and V3 remain `INCOMPLETE` (each command exited 2 as expected). Unresolved stages are 5/5/4 and unresolved Acceptance rows are 5/5/4. Stage-document audits and evidence-integrity subaudits all PASS, with zero current evidence hash failures. The V1.3 implementation and human acceptance remain incomplete; no version or sign-off was promoted.

| Version | Evidence references | Active manifests / entries | Historical manifests skipped |
|---|---:|---:|---:|
| V1 | 134 | 13 / 59 | 1 |
| V2 | 328 | 52 / 130 | 0 |
| V3 | 392 | 57 / 108 | 1 |

The old W1 V1.3 and W7 V3.3 execution manifests remain unchanged and are now explicitly labeled as historical snapshots. Current V1.3 source and contract hashes are covered by the new contract-boundary manifest.

Per-version machine reports: [V1](./2026-10-06-w9-after-v13-contract-v1-gate.json), [V2](./2026-10-06-w9-after-v13-contract-v2-gate.json), [V3](./2026-10-06-w9-after-v13-contract-v3-gate.json). [Combined SHA-256 manifest](./2026-10-06-w9-after-v13-contracts.sha256).
