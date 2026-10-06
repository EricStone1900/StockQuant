# W9 V2 historical manifest reconciliation (2026-10-06)

## Finding

The V2 evidence gate initially failed because three linked SHA-256 manifests captured dated execution snapshots whose referenced source files had subsequently changed: the 2026-10-03 V2.4 recovery-gap source/test snapshot, the 2026-10-02 O1 progress-document snapshot, and the 2026-10-05 V2.4 TestRun recovery file snapshot. The manifests and underlying historical evidence were preserved unchanged. Their references in the V2 stage documents and acceptance table now explicitly identify them as historical execution snapshots, matching the verifier's documented treatment.

## Verification

A focused V2.4 regression test now exercises calendar `CLOSED` and `UNKNOWN`: neither state creates a daily TestRun, requests quotes, nor enters the Paper execution path. `pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v24-live-observation.spec.ts` passed 17/17 tests and the Platform API typecheck passed. These are stubbed unit-level checks only; they do not establish live service behavior or add an observation day.

- `node scripts/verify-version-evidence.mjs --version V2`: PASS; 307 evidence references, 50 active manifests, 119 active manifest entries, 3 historical manifests skipped, zero missing evidence or hash failures.
- `pnpm docs:check`: PASS; 4,370 local Markdown links, zero failures.
- `git diff --check`: PASS.
- `pnpm verify:version -- --version V2`: exit 2 / INCOMPLETE. The stage documentation audit and evidence audit both PASS. The remaining W9 issue is six missing structured historical TestRun exports across V2.1 and V2.2; V2.3, V2.4 and V2.5 code/evidence rows pass their current checks. Human acceptance and real observation gates remain unfulfilled and are not inferred from these checks.

This reconciliation only corrects how historical snapshots are labeled. It does not rewrite past hashes, reconstruct missing Run payloads, change stage acceptance, alter running services, authorize data sources, or change NO_TRADE.
