# W9 current version gates refresh (2026-10-05 14:41Z)

A linked V1.1 point-in-time manifest from 2026-10-02 failed against four files modified by later approved migration hardening. The historical audit and its original manifest remain unchanged. The stage record now identifies that manifest as historical and links the current 2026-10-05 migration-guard audit; the current manifest's hash for the updated stage record was refreshed.

Current results:

- V1, V2, V3 `verify:version:evidence`: PASS; references/manifests/entries are 96/13/39, 289/49/117, and 306/57/106 respectively, with no failures.
- V1, V2, V3 `verify:version`: INCOMPLETE, exit 2; unresolved stage counts are 5/5/4. TestRun evidence is INCOMPLETE for V1 and V2, and NOT_RUN for V3.
- No historical TestRun, assertion, stage status, or human sign-off was reconstructed or changed.

The machine reports and command logs capture the checks. This refresh does not claim any version or stage acceptance.
