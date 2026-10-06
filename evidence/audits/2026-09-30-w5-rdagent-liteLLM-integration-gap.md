# W5 RD-Agent / LiteLLM runtime integration gap

Date: 2026-09-30. This is a source-level audit of the current worktree; it made no Provider or market-data requests.

## Verified current state

- `services/research-automation-service/src/adapters/deepseek-chat-provider.ts` and `siliconflow-embedding-provider.ts` implement bounded Provider transports. Their tests use injected `fetch` fixtures, not external networks.
- `application/v31-model-gateway.ts` reserves budget, durably marks dispatch before provider I/O, records usage evidence and avoids retrying an existing `modelRunId`. Its unit tests use an injected fixed provider.
- `bootstrap/main.ts` constructs `ModelGatewayCoordinator` only when `NODE_ENV=test` and `STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE=true`. Test-only OpenAI-compatible chat and embedding routes accept pinned LiteLLM payloads and convert deterministic responses through the same coordinator/budget ledger. Production and non-test environments return 404 for these compatibility routes.
- The regular bootstrap exposes a preflight which intentionally remains BLOCKED for runtime wiring, actual Provider cost reconciliation and enforced network/DNS egress. No production Provider coordinator is constructed.
- `runner/runner.py` scrubs inherited environment values. It now injects only fixed non-secret RD-Agent settings and remains designed to execute generated code without model credentials or network.

## Consequence

The pinned LiteLLM Python client has now called both test-only compatibility endpoints over an internal Docker network, with a temporary PostgreSQL ledger asserting one settlement per unique call. See [the internal Fixture smoke audit](2026-09-30-w5-litellm-internal-fixture-smoke.md) and its SHA-256 manifest. This closes chat/embedding protocol compatibility checks for direct client calls, but does not prove that the trusted RD-Agent controller's real `LiteLLMAPIBackend` is wired to the coordinator. That production runtime path remains NOT_IMPLEMENTED / NOT_RUN and live preflight must remain BLOCKED.

## Required next implementation boundary

Before any real call, the trusted controller side needs a durable, authorized experiment/call binding and a gateway-enforced per-experiment call and budget ceiling; enforced egress/DNS; invoice-grade cost evidence; and proof that RD-Agent content logging/retries are disabled at the actual controller call site. The LiteLLM compatibility smoke described above keeps external calls at 0 and validates chat and embedding protocol compatibility only. Live readiness remains blocked until source/model rights, user authorization, invoice-grade cost evidence, production egress enforcement and actual controller integration are independently satisfied.
