# W5 DeepSeek Chat bounded response audit

Date: 2026-10-02 (Asia/Shanghai)

The DeepSeek Chat adapter previously checked response size only after `arrayBuffer()` had fully buffered the body. It now reads chunks incrementally and cancels the stream immediately after the 8 MiB limit is crossed. Non-2xx provider response bodies are also cancelled without parsing or logging provider content. A fixture-backed stream test verifies rejection and cancellation before the fourth 3 MiB chunk; existing response parsing, usage, model, trace-ID, redirect, and redaction cases remain covered.

Checks run:

- `pnpm --filter @stockquant/research-automation-service exec vitest run tests/unit/deepseek-chat-provider.spec.ts tests/unit/siliconflow-embedding-provider.spec.ts` — exit 0, 2 files / 8 tests.
- `pnpm --filter @stockquant/research-automation-service lint` — exit 0.
- `pnpm --filter @stockquant/research-automation-service build` — exit 0.
- `pnpm --filter @stockquant/research-automation-service test` — exit 0, 35 files / 196 tests (run with local loopback permission for local proxy echo tests).

No credentials were read, no Provider/network request was made, no market data was accessed, and no active service, Paper or broker was touched. The V3.1 Provider authorization remains disabled.

This closes a response-buffering boundary for the DeepSeek component only. It does not prove Provider adapter runtime wiring, enforced egress, invoice reconciliation, real RD-Agent execution, V3.1 acceptance, Ubuntu, observation or user sign-off.
