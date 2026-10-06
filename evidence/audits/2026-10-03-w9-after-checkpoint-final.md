# Final W9 gates after checkpoint source refresh

Date: 2026-10-03. After the W7 durable checkpoint slice, the linked current-source SHA references in the V1/V3 PRD stage documents were refreshed to a new source-only manifest. Earlier run-specific manifests remain untouched as historical evidence.

All three version gates now return the expected `INCOMPLETE` / exit 2:

- V1: five unresolved stages; stage-document audit PASS; evidence audit PASS (90 references, 12 manifests, 48 entries); missing/unexpected acceptance rows 0/0.
- V2: five unresolved stages; stage-document audit PASS; evidence audit PASS (255 references, 42 manifests, 267 entries); missing/unexpected acceptance rows 0/0.
- V3: four unresolved stages; stage-document audit PASS; evidence audit PASS (271 references, 52 manifests, 130 entries); missing/unexpected acceptance rows 0/0.

The machine outputs are [V1](./2026-10-03-w9-after-checkpoint-v1-gate.json), [V2](./2026-10-03-w9-after-checkpoint-v2-gate.json) and [V3](./2026-10-03-w9-after-checkpoint-v3-gate.json). The current-source sidecar is [SHA-256 manifest](./2026-10-03-w9-current-shared-sources-after-checkpoint.sha256). This clears evidence-integrity failures only; none of the unresolved business stages, observations, human acceptances, market authorization, or Ubuntu requirements are thereby complete.
