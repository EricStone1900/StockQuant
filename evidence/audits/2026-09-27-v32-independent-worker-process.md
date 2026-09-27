# V3.2 one-shot independent Fixture Worker process

Date: 2026-09-27 (Asia/Shanghai)

## Change

Added a separate one-shot Node process at `services/quant-research-service/scripts/v32-independent-validation-worker.mjs`. It authenticates to Quant with the dedicated `quant-validation-worker` Bearer token, reads an immutable PromotionRequest through a new Worker-only route, checks its request fingerprint, and only accepts `candidateSource=FIXTURE`. It verifies the frozen Fixture manifest and exact file hashes, recomputes the candidate, code, data manifest, metrics and validation-plan bindings, calculates the fixed reference evaluator's five checks, then submits the report over HTTP using the same Worker identity.

Quant now exposes `GET /v1/promotions/{promotionRequestId}/validation-input` to the validation-worker identity only. The worker identity may also submit the existing immutable report route; it cannot read reports, request detail, Registry, or other PromotionRequests. Platform and Governance are explicitly denied the validation-input route. OpenAPI, JSON Schema, compatibility matrix, generated types and auth tests are aligned.

The random-DB integration test starts this child process after creating a request. It confirms report/evidence persistence, identical replay, changed/tampered report rejection, and no activation. The host controller launches the reference evaluator in the exact-image-ID Linux/ARM64 container `sha256:ce165dcca6608664c518ae71c86ed3fce33da1d1e88b5dee2504fc0cbff55beb` with `--network none`, read-only root/input mounts, UID/GID 65532, no capabilities, `no-new-privileges`, 256 MiB, 1 CPU and 64 PIDs. The evaluator reads its own `/proc` and cgroup state and fails unless root/input mounts are read-only, the UID and limits match, the route table is empty, IPv6 addresses are loopback-only, all non-loopback interfaces are down, and their traffic counters are zero. This accommodates the kernel's registered but disconnected tunnel interfaces under Docker `network none`. The Bearer token never enters the container. It executes only the trusted reference evaluator over the whitelisted synthetic Fixture; it does not execute candidate-provided code or invoke Qlib.

## Verification

- `pnpm --filter @stockquant/quant-research-service test:integration` — PASS; random disposable PostgreSQL database and loopback HTTP, including a separately spawned Worker and restricted evaluator container. The test asserts the pinned image ID, observed in-container isolation/cgroup state and that the one-shot container no longer exists after exit; database cleanup is part of the script.
- `pnpm --filter @stockquant/quant-research-service test` — PASS; 46 TypeScript tests and 12 Python Worker tests.
- `pnpm contracts:check` — PASS; 119 JSON files, 68 schemas, 34 Fixtures, 55 compatibility rules; Quant Promotion OpenAPI has 8 operations.
- `pnpm verify:stage -- --stage V3.2 --suite code` — PASS; includes the Worker integration, all V3.2 code checks, builds and unit tests.
- `pnpm test:e2e -- --stage V3.2` — PASS, 4/4 using Playwright's managed local Vite server and intercepted synthetic APIs. The stage wrapper no longer defaults to an unstarted container preview on port 8080; `PLAYWRIGHT_BASE_URL` remains available for explicit container runs.
- `pnpm --filter @stockquant/web typecheck`, `pnpm baseline:check`, and `git diff --check` — PASS.
- Three separate `pnpm verify:stage -- --stage V3.2 --scenario <normal|rejection|recovery> --seed 20260907` runs — each returns exit 2 with `status=WAITING` and no TestRun, citing the unmet V3.1 acceptance, real persisted-candidate isolation, fingerprint consumers and V3.2 business workflow/export. These are prerequisite-gate results, not test failures or PASS scenarios.
- Stage result remains `businessValidation=NOT_RUN`, `activeRegistryMutation=NOT_PERFORMED`, and `humanAcceptance=NOT_RUN`. Synthetic disposable Registry rows are created only by the test database flow.

## Boundary

This advances the execution mechanism for frozen synthetic validation only. It does not execute candidate-provided code, independently validate Qlib results, or constitute real-market evidence; real candidate inputs are rejected by this worker. It does not provide a deployed long-running worker, a V3.2 accepted TestRun/evidence export, a real accepted V3.1 prerequisite, or user acceptance. No active Registry, Mandate, broker, or simulated account was changed.

## 2026-09-27 follow-up: execute the exact frozen candidate source

The initial implementation above ran only a reference calculation. It has now been extended to execute the exact allowlisted synthetic candidate `sourceCode` before reference recomputation. Before starting either container, the host Worker verifies the frozen manifest and all fixture-file hashes, then checks the exact candidate source, source SHA-256 `9392a720f5e7576f7047b93c212b0d3776e3621a2379e1878a25e93cfb6303ff`, and artifact SHA-256 `ab09b5e966c0e5c179dc423a56250e08354cc20795ba12761cfab8b98ea707d4`. The Python runner repeats these exact allowlist checks before `exec`; arbitrary candidate code is rejected.

The candidate runs in pinned `linux/arm64` Python image `sha256:829cc065f506a60d332260af9fc48c590d60cfeff8bfc20df57b7baf20edb879` under `--network none`, read-only root and mounts, UID 65532, dropped capabilities, no-new-privileges, 256 MiB, one CPU and 64 PIDs. It emits 70 date/index-bound boolean decisions. A separate pinned Node evaluator container independently recomputes the 5/20 SMA decisions, requires the complete unique decision set, then uses the candidate signals as the OOS trade input and fails RULES on any mismatch. The Bearer remains in the host Worker; decision output is passed to the evaluator through a mode-0600 temporary file and read-only mount. Both containers are checked for cleanup.

Verification: Quant focused recomputation tests pass 10/10, including all 70 matches and altered/missing/duplicate/hash-mismatched decisions; TypeScript build passes; `pnpm --filter @stockquant/quant-research-service test:integration` passes with disposable PostgreSQL, actual ARM64 candidate and evaluator containers, report persistence/replay and unchanged active Registry. The integration asserts both image IDs/platforms, source hash, 70 decisions, observed candidate UID and evaluator isolation. Qlib remains `NOT_RUN`; only the frozen synthetic source was executed. Real RD-Agent/user candidates, V3.1 prerequisite, formal V3.2 TestRun/evidence export and human acceptance remain `NOT_RUN`; no active Registry/Mandate/broker/account changed.
