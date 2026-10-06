# W9 exact legacy TestRun payload scan

Date: 2026-10-02 (Asia/Shanghai)

## Result

Added a repeatable read-only scanner that obtains unresolved V1/V2 associations from the current version acceptance gates, then inspects structured JSON under `evidence/local/` for exact `stageId` and `testRunId` identity matches. It does not treat UUID mentions in prose, assertion text, or another stage's export as a payload match.

The scan read 70 local JSON exports and found 22 unresolved associations: 16 V1 and 6 V2. Exact stage-and-run identity matches: 0. Two other legacy exports exist at the repository root of `evidence/local/`, but neither identity matches the unresolved IDs. They were not repurposed.

## Reproduction and verification

- `node scripts/audit-legacy-testrun-payloads.mjs` prints pure JSON without writing files or connecting to services. `pnpm audit:legacy-testruns` is the equivalent package entry.
- `node --test scripts/audit-legacy-testrun-payloads.test.mjs` passed 1/1. The test proves exact identity matching and rejects same-UUID/wrong-stage evidence.
- The resulting JSON is `2026-10-02-w9-legacy-payload-scan.json`.

This is a locator audit only. Any future match still requires the stage-scoped bundle verifier, original manifest/hash checks, completed status and assertions, and any actual user sign-off. It does not change W9 status or acceptance history.
