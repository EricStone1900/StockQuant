# P0.2 Runner Host lifecycle contract audit

- Date: 2026-09-27 (Asia/Shanghai)
- Scope: Research Automation's existing Runner Host claim/input/heartbeat/complete API and current generated schema types.
- Result: Contract, typed-wrapper and isolated runtime checks PASS. Runner remains `NOT_CONFIGURED` by default; this is not a real RD-Agent run or production enablement.

## Contract and implementation

The four lifecycle routes were already protected by the dedicated `runner-host` Bearer identity and require the current worker lease/fencing token on input, heartbeat and completion. A host-side wrapper already called them, but their OpenAPI/request/result contract was absent. Added JSON Schemas for claim and complete commands, execution result, and RunnerJob record; the OpenAPI now records all four routes, request/response shapes, dedicated identity, error responses and lease-fencing requirement. The wrapper and Runner execution result consume generated Research Automation types. `scripts/generate-runner-host-client.mjs` now generates the four-operation HTTP client directly from the OpenAPI, `contracts:generate` refreshes it, and `contracts:check` detects drift; the existing wrapper delegates lifecycle calls to that generated client.

The isolated HTTP smoke was also repaired to use UUID TestRun IDs and create its own persisted experiment/budget prerequisites, then remove only that job's database rows and artifact paths. Cleanup verification uses explicit SQL casts for the UUID and text identifiers.

## Verification

- `pnpm contracts:generate` completed.
- `pnpm contracts:check` exited 0: 139 JSON files, 84 schemas, 34 fixtures, 72 compatibility rules, 15 OpenAPI groups.
- `pnpm --filter @stockquant/research-automation-service build` exited 0.
- `pnpm --filter @stockquant/research-automation-service test` exited 0: 26 files, 150 tests.
- `pnpm --filter @stockquant/research-automation-service runner:host-http-smoke` exited 0 twice against `research_automation_test`, a temporary loopback service and isolated Docker runner. The final run exercised the OpenAPI-generated client: host SIGKILL, lease expiry/takeover at fencing token 2, heartbeat renewal, prior container removal, output Artifact SHA-256 verified, stale publication rejected with HTTP 409, exact rows/files removed.

The HTTP smoke required local loopback/Docker privileges. Initial attempts exposed three pre-existing smoke-harness issues (loopback denied by sandbox; test IDs not UUIDs; missing experiment prerequisite), followed by a cleanup verification type mismatch. The final authorized run passed and cleaned the exact resources. No production service or runner configuration was changed.

## Remaining boundary

The Runner Host lifecycle HTTP client is now generated from OpenAPI, but other Research Automation and historical replay routes remain to be inventoried and their clients are not all generated. No Runner was left configured or active.
