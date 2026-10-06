# Quant Research → Qlib Worker generated client audit

Date: 2026-10-01

## Change

Added `quant-research-qlib-worker.v1` OpenAPI operations for `GET /probe` and `POST /qlib/fit-fixture`, `/train` and `/validate`, tied to canonical request/result schemas and the `quant-research-service` service identity. Added a generated client and drift check; Quant Research now uses it for all four Qlib Worker routes, including its multi-bar Fixture summary flow. Summary train/validate remain clearly labelled Fixture-only and hash recomputation; they do not claim model training or independent model validation. Worker HTTP failures preserve their status and response body, and Fixture Fit keeps its 120-second timeout.

## Verification

- `pnpm contracts:check`: PASS; 206 JSON files, 142 schemas, 36 fixtures, OpenAPI and generated-client drift checks passed.
- `pnpm --filter @stockquant/quant-research-service typecheck`: PASS.
- `pnpm --filter @stockquant/quant-research-service exec vitest run tests/unit/qlib-worker-client.spec.ts`: PASS, 4 tests.
- `pnpm verify:stage -- --stage V2.3 --suite code`: PASS, exit 0 after the ordinary sandbox denied the Qlib Worker's isolated loopback bind. The controlled run covered full monorepo quality checks, isolated service-auth/PostgreSQL checks, the pinned Qlib 0.9.6 synthetic Fixture fit and the Web→Platform→Quant Research→Qlib Worker→Platform PostgreSQL TestRun.
- Latest TestRun: `c33d4548-17e5-4aab-a195-264ef6eb7029`; Fixture data; no external sources; FakeBroker; independent validation `NOT_RUN`.
- Durable Artifact SHA-256: `24864d22e4016e1419382e380aec504f02607004262696c92b76451cc1dbb6a8`.
- Latest evidence export manifest SHA-256: `89d6f09ca71e058f35f6c55abf5a19bc6b871a7eb421c6eb8a4d8a9ef8c7d48a`.
- Disposable test databases, Qlib container and image cleanup: PASS.

## Limits

This is local Fixture engineering evidence under `linux/amd64` emulation on Apple Silicon. It does not authorize or verify market-source collection, prove PIT/market-data research correctness, run independent model validation, verify active deployment, or close V2.3/W4 or user acceptance.
