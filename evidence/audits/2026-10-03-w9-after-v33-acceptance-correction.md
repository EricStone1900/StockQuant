# W9 version-gate snapshot after V3.3 acceptance correction

Date: 2026-10-03 (Asia/Shanghai)

Ran the current `verify-version` command independently for V1, V2 and V3 after updating the V3.3 acceptance row to reflect current engineering evidence. All commands returned the expected exit code 2 with `INCOMPLETE`; no stage or human sign-off was promoted.

| Version | Gate | Evidence references | Manifests | Manifest entries | Evidence failures |
|---|---:|---:|---:|---:|---:|
| V1 | INCOMPLETE | 90 | 12 | 50 | 0 |
| V2 | INCOMPLETE | 255 | 42 | 267 | 0 |
| V3 | INCOMPLETE | 274 | 52 | 132 | 0 |

Machine results: [summary](./2026-10-03-w9-after-v33-acceptance-correction.json), [V1](./2026-10-03-w9-after-v33-acceptance-correction-v1.json), [V2](./2026-10-03-w9-after-v33-acceptance-correction-v2.json), [V3](./2026-10-03-w9-after-v33-acceptance-correction-v3.json).

The evidence-reference audit passed for all three versions, with no missing or unexpected acceptance mappings and no invalid PASS claims. The version gates remain incomplete for their documented business, historical TestRun export, authorization, observation, Ubuntu and human acceptance requirements. This snapshot does not change any active service, account, subscription or ledger, and does not count an observation day.
