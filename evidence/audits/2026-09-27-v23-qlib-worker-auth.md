# V2.3 Qlib Worker per-service Bearer boundary audit (2026-09-27)

## Outcome

Applied the selected P7.2 identity decision to every Qlib Worker operation. `/probe`, `/train`, `/validate`, and `/qlib/fit-fixture` now require the exact `quant-research-service` service ID and its distinct configured Bearer token; missing configuration fails closed, and mismatched/missing credentials receive 403. The quant service sends this identity for health/readiness probes, Fixture summary calls, validation calls, and the bounded Qlib fit endpoint. The Compose healthcheck uses the same service identity. Caller tokens for Platform→Quant remain a separate hop and are not reused as the Worker credential.

## Verification

- Quant TypeScript unit tests: 39/39; Python Worker tests: 12/12; full quant service `test` command exited 0.
- Random isolated PostgreSQL + loopback HTTP `test:integration` exited 0. It confirms unauthorized callers never reach the fit Worker and the Worker hop carries the dedicated `quant-research-service` Bearer plus matching service ID; immutable promotion/report checks also passed.
- Full `pnpm verify:stage -- --stage V2.3 --suite code` exited 0 after a sandbox loopback denial on the first attempt. The successful rerun included repository baseline, all workspace build/lint/typecheck/unit checks, 12 Worker tests, Ops 97/97, Python Adapter 58/58, Market Data PostgreSQL integration 22/22, and related HTTP/database checks.
- `docker compose -f infra/compose/docker-compose.yml config --quiet` exited 0.
- `qlib:fit-smoke` rebuilt the current pinned Qlib Worker image and exited 0 under linux/amd64 emulation on Apple Silicon. Authenticated `/probe` returned READY; Qlib 0.9.6 `LGBModel.fit`/`predict(test)` succeeded on 120 deterministic synthetic rows (72/24/24), produced 24 finite predictions, reproduced model and prediction SHA-256 on the repeat run, and rejected an overlapping split with 422. Temporary image `sha256:81999fb5d7d3c289bc841616f102765e918cd9c8fadf5d2c8a58fa65f340d182` was removed.

## Limits

This closes the unauthenticated internal Worker endpoints in source and verifies the caller identity in isolated tests. It does not deploy/restart the active Compose services or configure secret values; an unset token intentionally leaves the Worker unhealthy/unavailable. It does not prove native Ubuntu behavior, real market-data training, candidate execution, independent model validation, business acceptance, or human sign-off. Existing fixture-only and observation gates remain unchanged.
