# W1 Platform dependency readiness probes — 2026-10-02

## Change

Platform had five ad hoc `fetch()` calls for Portfolio, Trade Execution, Historical Replay, Market Data, and Research Automation `/ready` endpoints. They now go through `probeServiceReadiness` / `requireServiceReadiness`: a 3-second abort timeout, successful HTTP status and valid JSON required for READY, and transport, non-2xx, timeout, or invalid JSON mapped to UNAVAILABLE. Required dependencies fail readiness with a stable dependency-specific error. Read-only preview pages expose UNAVAILABLE instead of forwarding an error response body as if it were a healthy service result.

The readiness endpoints are operational health probes, not domain/business APIs; versioned generated clients remain mandatory for business operations. No credentials, source collection, Paper execution, active service, or persistent state were used or changed.

## Verification

- Platform API unit suite: 45 files / 156 tests PASS, including new 3-case probe tests.
- Platform API typecheck and build: PASS.
- `pnpm baseline:check`: PASS; 2,116 Markdown links, contract/Fixture checks, eight service-layer checks, and 25 architecture/version-gate tests.
- `pnpm verify:stage -- --stage V1.1 --suite code`: controlled run exit 0. An ordinary sandbox attempt was denied ephemeral loopback binding by the Quant Worker test (`EPERM`); the controlled rerun passed.
- `git diff --check`: PASS.

This closes only the five Platform operational readiness probes. It does not close all W1 cross-service business client migration, shared Artifact lifecycle/retention authorization, activity API cutover and rollback, stage-specific new user acceptance, or any market observation gate.
