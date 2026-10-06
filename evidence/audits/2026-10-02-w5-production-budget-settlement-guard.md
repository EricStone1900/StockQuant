# W5 Production budget settlement guard

Date: 2026-10-02 (Asia/Shanghai)

## Finding and change

The authenticated Research Automation endpoint `POST /v1/experiments/:id/budget/settle` previously accepted caller-supplied cents in production. The current production Provider path is deliberately not wired, so real usage and invoice reconciliation cannot be proven; accepting an arbitrary settlement could release a RESERVED or UNKNOWN amount without evidence. The endpoint now returns 404 unless both `NODE_ENV=test` and `STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE=true`. Fixture settlement remains available to deterministic tests. Production settlement through a future invoice-evidence workflow is still unimplemented.

The new `budget:settlement-production-http-smoke` runs the built service in production mode with an in-memory ledger, creates an isolated reserved experiment, submits a caller-provided zero-cost settlement using the valid Platform API Bearer, and verifies HTTP 404 plus unchanged `RESERVED / spentCents=0`. It makes no model calls. The smoke is part of the V3.1 complete code suite; V3.2 preparation smoke explicitly enables the test Fixture before using fixture-only settlement.

## Verification

- Research Automation unit tests: 184/184 PASS; build and lint PASS.
- Production-mode HTTP smoke: PASS (`settlementEndpoint=404`, budget remains `RESERVED`, `spentCents=0`, `externalCalls=0`).
- `pnpm verify:stage -- --stage V3.1 --suite code`: exit 0 against current-worktree `linux/amd64` image `sha256:2c6429648e6c2b2932c8831fdf6496fa2fcc67250a8e60b719a67bb1b20285f1`. Includes contracts, isolated PostgreSQL integration, service auth, internal LiteLLM-compatible fixture smoke, Platform checks, owner-scoped Artifact smoke, and Web typecheck. The fixture network is internal-only; no external model Provider was contacted.
- `activeServicesTouched=false`; no settlement was applied to any persistent or active ledger. The local production smoke's in-memory process was terminated after verification.

## Remaining scope

This only closes the unsafe direct-settlement path. It does not implement invoice-grade Provider cost reconciliation, production Provider wiring, network/DNS enforcement, a real RD-Agent run, or V3.1 human acceptance. V3.1 remains NOT_RUN for business validation and human acceptance; no stage status is upgraded.
