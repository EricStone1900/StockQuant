# P1 V1.1 formal isolated stage entry rerun

Date: 2026-10-07  
Command: `pnpm test:e2e -- --stage V1.1`  
Result: exit 0. The formal stage entry dispatched to `test:integration:v11-stage-storage`, ran the V1.1 code suite against a random stage-mode Compose stack, then Chromium normal/rejection/recovery 3/3. Each browser-created TestRun was checked through CLI `--check-only` with the same UUID.

Isolated Compose project: `sq-v11-stage-ec7d1d5666183e86a70b`. Recovery compared the target Portfolio container against the exact project before restart, then waited for health and verified the original Run resumed. Harness confirmed removal of this project's containers, PostgreSQL volume, network, and tagged images. No active Compose service or volume was targeted.

Run IDs printed by browser/CLI: `fa2bf85a-fb29-4219-89d9-f535b6a3a874` (normal), `774d4367-5a52-4ae2-b4ff-185a02b5cbed` (rejection), and `acd9fedf-324b-44cf-b248-934613f36091` (recovery). The isolated database was removed after verification, so these IDs are documented as execution output, not as retained structured evidence bundles or user sign-offs.

## Diagnostic history

Before correcting command routing, the same top-level command launched the native WebServer and ran Playwright directly: normal and rejection passed, but recovery failed before service interaction because the required isolated project identity was absent. This failure was preserved. The stage command now dispatches V1.1 to its existing isolated code/Web/CLI harness. Routing unit tests pass 6/6 and the corrected full command above passes.

## Boundary

This establishes current isolated code and fixed Web/CLI recovery evidence. It does not establish a legacy/stage activity-store cutover, rollback, new human acceptance, Ubuntu delivery, or complete V1.1/P1 closure.
