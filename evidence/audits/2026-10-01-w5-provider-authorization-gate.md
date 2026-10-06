# W5 explicit Provider-call authorization gate

Date: 2026-10-01 (Asia/Shanghai).

`STOCKQUANT_MODEL_PROVIDER_CALLS_AUTHORIZED` is now an explicit boolean deployment setting, defaults to `false`, and rejects values other than `true` or `false`. Compose explicitly forwards the value with a `false` default. The Research Automation configuration exposes the authorization state to the model gateway preflight; absent authorization is reported as a blocker. LIVE mode and present credentials do not imply authorization. Even if explicitly enabled later, preflight remains blocked until Provider adapters are wired, cost reconciliation exists, and DNS/network egress enforcement is evidenced. `.env.example`, the service README and security architecture now document this gate.

The local credential-reference preflight also reports the explicit boolean without exposing secret values, keeps `liveCallsAuthorized=false`, and blocks malformed authorization values. Its six focused tests pass. Full Ops tests passed 163/163 after a normal sandbox run exposed two expected loopback-listener `EPERM` failures; the controlled rerun with loopback permission passed both.

Verification: Research Automation 173 unit tests passed, TypeScript lint passed, `docker compose -f infra/compose/docker-compose.yml config -q` passed, and `STOCKQUANT_RESEARCH_IMAGE_ID=sha256:4cb517d99727cab1f5001f53dcc11aa0cf2d42ad5ce564e685d5dbc28796a730 pnpm verify:stage -- --stage V3.1 --suite code` exited 0. LiteLLM chat/embedding used only the fixed fixture on an internal-only Docker network (`externalProviderCalls=0`); Artifact owner-scope HTTP smoke and Platform 116 tests passed. `pnpm baseline:check` and evidence-reference checks are recorded in the linked W9 refresh.

This is a configuration safety gate and fixture regression only. It does not authorize calls or complete V3.1; real Provider execution, invoice reconciliation, enforceable egress, business acceptance and human sign-off remain NOT_RUN.
