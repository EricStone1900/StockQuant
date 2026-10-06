# W9 evidence consistency review — 2026-10-02

## Scope

Recheck linked V1/V2/V3 evidence references, SHA-256 manifests, and version gates after the V2 acceptance document changed during the 2026-10-02 delivery work. This is a documentation and evidence-integrity check; it does not run business acceptance, activate data collection, contact providers, or sign off for the user.

## Results

- `pnpm verify:version:evidence -- --version V1`: PASS; 46 references, 7 manifests / 8 entries, no missing evidence or hash failures.
- `pnpm verify:version:evidence -- --version V2`: PASS; 150 references, 23 manifests / 37 entries, no missing evidence or hash failures. The previously stale entry in `2026-10-01-w1-qlib-legacy-jsonb-backfill.sha256` was refreshed for the changed V2 acceptance document and audit note; the manifest now verifies.
- `pnpm verify:version:evidence -- --version V3`: PASS; 137 references, 25 manifests / 28 entries, no missing evidence or hash failures.
- `pnpm verify:version -- --version V1|V2|V3`: each returns exit 2 / INCOMPLETE. Stage-document and evidence audits are PASS; unresolved required stage work remains, so this is the expected outcome.
- `git diff --check`: PASS.

The version gate confirms document/evidence structure only. Remaining business validation, source authorization, observation windows, Ubuntu execution and human acceptance remain open as recorded in the plan and stage acceptance documents.
