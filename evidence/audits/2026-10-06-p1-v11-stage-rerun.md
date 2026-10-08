# P1 V1.1 isolated stage rerun — 2026-10-06

Status: automated isolated acceptance PASS for the scenarios in this run; P1 remains IN_PROGRESS. This is not user acceptance, active API cutover, migration rollback, or whole-stage completion.

## Environment and commands

- Command: `pnpm test:integration:v11-stage-storage` (exit 0).
- The harness invoked `pnpm verify:stage -- --stage V1.1 --suite code`; baseline checks, contracts, fixture hashes, service layers, build/typecheck/tests completed before Chromium.
- Temporary Compose project: `sq-v11-stage-00ccb946000eeb9f2a91`; isolated PostgreSQL volume and integration network. Only the temporary Platform API and Portfolio services used this DB.
- Browser: Vite at `http://127.0.0.1:58009/`, Playwright Chromium, one worker.
- Evidence-bearing TestRun IDs:
  - normal `46a8596a-1cef-4703-bb03-8a6ada196e90`
  - rejection `20b88fb5-df34-4bf4-9d55-a01e26297299`
  - recovery `1c6818e6-f958-4ded-b9ad-f3ddf02096ff`
- Recovery restarted only the verified isolated Portfolio container. Each browser-created TestRun was checked by the same UUID through the read-only CLI.

## Result and boundaries

All three Web cases passed. The code suite also completed; contract drift check reported 25 generators and 110 consumer rules, and fixture verification reported 21 files with zero hash failures. Docker built isolated images for Platform API and Portfolio from the current workspace. The harness reported exact cleanup success for containers, volume, network, and images.

No shared/active volume, active writer, external market provider, real broker, or model endpoint was used. This run proves only the V1.1 stage-storage slice and its current test scenarios. It does not close V1.1 cross-service migration/release coverage, common Artifact lifecycle, activity cutover/rollback, missing historical exports, the remaining V1.1 requirements, or human sign-off.
