# V1.2 Qlib ArtifactRef contract slice

Date: 2026-10-07 (Asia/Shanghai)

Status: PASS for the V1.2 Qlib strategy ArtifactRef slice; the broader P1 Artifact and release gates remain open.

The V1.2 immutable Qlib strategy Artifact now projects the shared `artifact-ref.v1` identity in both the persisted TestRun evidence and the owner-scoped Artifact read response. The reference carries the same artifact ID and SHA-256, TestRun and owner, `MODEL_PREDICTIONS` kind, stable `research/<testRunId>/qlib-fixture` namespace, lifecycle status, and V1.2 source reference. Existing Artifact payload and response fields remain available. Content ownership, storage, cancellation, fencing, and lifecycle behavior are unchanged; no expiry policy or deletion behavior was introduced.

Validation:

- `pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v12-acceptance.spec.ts`: PASS, 7 tests.
- `pnpm --filter @stockquant/platform-api-service build`: PASS.
- `pnpm contracts:check`: PASS, including 286 JSON files, 203 schemas, compatibility matrix and 23 OpenAPI contracts.
- `git diff --check`: PASS.
- `node scripts/test-v12-e2e-isolated.mjs`: PASS, Playwright 1/1; real locked Qlib 0.9.6 CN_A/US_EQUITY fits; normal/rejection/recovery-probe same-Run CLI checks; cancellation before Artifact publication; Platform restart recovery (`resumeCount=1`); ArtifactRef returned by the Artifact endpoint equals the reference in that TestRun's evidence; isolated Compose resources removed and verified.

Primary normal TestRun: `06af4dcd-86af-4e85-82df-207dc7842565`. Artifact ID and content SHA-256: `aaad642e185dc622d2fe79764f6527645c05709a4d41f536f6e7a2ba7e61e3`. Isolated Compose project: `sq-v12-e2e-bdfb6470595aee4cfb60`. Machine evidence: [isolated V1.2 run](./2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-bdfb6470595aee4cfb60.json). Source and evidence hashes: [SHA-256 manifest](./2026-10-07-p1-v12-artifact-ref.sha256).

This evidence closes only the V1.2 Qlib Artifact reference contract slice. V1.3 execution/reconciliation and V1.4 report artifacts still need the same end-to-end identity/access/export audit before P1's unified V1 Artifact requirement can pass. Human acceptance remains NOT_RUN; no stage or version sign-off is implied.
