# P0.2 Historical Replay Worker contract audit

- Date: 2026-09-27 (Asia/Shanghai)
- Scope: Historical Replay Worker HTTP ingress for synchronous/asynchronous single-Bar and multi-Bar replay, run lookup/lifecycle, and UNKNOWN recovery.
- Result: Contract generation/checks and isolated Worker build/unit/code-suite checks PASS. This is an API contract and runtime input-validation slice, not a Web/CLI acceptance or replay behavior re-acceptance.

## Contract and implementation

Added schemas for replay commands, multi-Bar commands, replay bars, accepted responses, and run status. `historical-replay-worker.v1.json` describes five route groups: single and multi submission (including `async=true`), run lookup, pause/resume/cancel, and UNKNOWN recovery. The compatibility matrix records the new consumer-facing fields. The contract checker enforces the expected operations, service identity/scope, request bodies/references, responses and asynchronous query parameter.

The Worker now imports generated TypeScript command types and parses incoming commands at the HTTP boundary. It rejects unknown fields and validates UUIDs, bounded identifiers, supported scenarios, nonnegative int32 seeds, timestamps, decimal price precision, nonnegative safe volumes, and nonempty multi-Bar inputs. Path run IDs for lookup/control/recovery are also validated. The OpenAPI describes the existing dedicated service identity; it does not add or change runtime credentials.

The Platform consumer now uses `GeneratedHistoricalReplayClient`, generated from this OpenAPI by `scripts/generate-historical-replay-client.mjs`. The generator emits the five typed operations, URL/query construction, Platform service identity/Bearer headers, timeout, and status-preserving HTTP error. `contracts:generate` refreshes it and `contracts:check` detects drift. V2.3 multi-Bar submission (sync/async) and run lookup/lifecycle controls use the generated client instead of handwritten `fetch` construction.

## Verification

- `pnpm contracts:generate` completed.
- `pnpm baseline:check` exited 0: 901 Markdown links; 145 JSON files, 89 schemas, 34 fixtures, 75 compatibility rules, 16 OpenAPI documents/groups.
- `pnpm --filter @stockquant/historical-replay-worker build` exited 0.
- `pnpm --filter @stockquant/historical-replay-worker test` exited 0: 5 files, 17 tests.
- `pnpm --filter @stockquant/platform-api-service build` exited 0; Platform unit tests passed: 22 files, 76 tests, including new tests for Platform identity/Bearer headers, sync/async URLs, lifecycle routes and HTTP error status.
- `pnpm contracts:check` exited 0 and verified the generated Historical Replay client has five operations with no drift.
- Expanded `pnpm test:service-auth:http` exited 0 using a random dedicated PostgreSQL database. It exercised 14 forbidden route probes across seven replay submit/control/recovery write routes, separately using a Runner Host identity and a Platform service-id paired with the wrong Replay Worker Bearer (all 403). Three malformed Platform-authorized submit routes stopped at validation (422); pause/resume/cancel on an absent random run returned 404; recovery without original order evidence returned 422. The harness dropped the random database and verified it no longer existed.
- `node --test scripts/code-suite-plan.test.mjs` exited 0: 5 tests, including confirmation that V2.3 runs the service identity smoke before the Qlib component.
- `pnpm verify:stage -- --stage V2.3 --suite code` exited 0 in the authorized isolated local test environment after the client was wired and the HTTP smoke registered. The suite included repository build/lint/typecheck/unit checks, service integration/database checks, the Historical Replay route-identity smoke above, Market Data PostgreSQL integration (22 tests), and the locked Qlib container fit smoke (Qlib 0.9.6, deterministic synthetic 72/24/24 split, 24 finite test predictions, repeated model/prediction hashes matched). The Qlib image ran as emulated Linux/amd64 on Apple Silicon and was removed by the smoke script.
- The same code-suite command first failed under the restricted sandbox because a required local loopback bind returned EPERM; the authorized isolated run completed successfully. This was an environment boundary, not treated as a passing test.

## Remaining boundary

The Historical Replay client is now generated and wired for current Platform submission and lifecycle calls. Full route/consumer inventory and cross-owner denial integration tests remain outstanding. Existing V2.3 research validation remains `NOT_RUN` for independent validation, and the stage remains `PARTIALLY_IMPLEMENTED`; this contract work does not establish market-data provenance/PIT, candidate validation, Web/CLI re-acceptance, Ubuntu runtime evidence, or new human sign-off. No active services, user data, or credentials were changed.
