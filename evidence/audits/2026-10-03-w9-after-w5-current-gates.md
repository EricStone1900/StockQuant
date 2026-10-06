# W9 version-gate refresh after W5/W4 evidence

Captured 2026-10-03 08:23:57 UTC after the V3.1/V3.2 fixture-suite and V2.3 Qlib Fixture reruns and their stage-document updates.

`pnpm baseline:check` exited 0: governance tests 26/26, 229 JSON files, 159 schemas, 39 fixtures, and documentation/contract/fixture/service-layer checks passed. The three `verify-version` commands each exited 2 with `INCOMPLETE`; their stage-documentation and evidence-reference/Manifest audits all passed. V1 checked 88 references, 11 Manifests and 28 Manifest entries; V2 checked 271/46/112; V3 checked 296/55/120. Missing/unexpected acceptance mappings and invalid PASS claims were zero. Unresolved stage counts remain 5/5/4 for V1/V2/V3.

This is a governance-integrity pass only. It does not change any business stage, observation, Ubuntu, or user sign-off status. Structured results: [w9-after-w5-current-gates.json](./2026-10-03-w9-after-w5-current-gates.json).
