# W5 SiliconFlow Embedding bounded-response check

Date: 2026-10-02 (Asia/Shanghai)

The SiliconFlow Qwen3-Embedding-4B adapter previously checked the body length only after `Response.arrayBuffer()` completed. A response without `Content-Length` could therefore be fully buffered before rejection. The adapter now reads response chunks incrementally, cancels the stream as soon as the 16 MiB ceiling is crossed, and only then decodes the collected bounded bytes. A fixture stream test proves cancellation happens before its fourth 6 MiB chunk and that the request rejects with the size-limit error.

The official SiliconFlow model page currently lists Qwen3-Embedding-4B input at USD 0.02 per million tokens: https://www.siliconflow.com/models/qwen3-embedding-4b. The versioned local tariff snapshot uses this rate. This verification involved no credentials, network call to the inference endpoint, external Provider request, activity service, market source, Paper, or broker.

Checks:

- `pnpm --filter @stockquant/research-automation-service exec vitest run tests/unit/v31-siliconflow-cost.spec.ts tests/unit/v31-siliconflow-embedding-response.spec.ts tests/unit/siliconflow-embedding-provider.spec.ts` — exit 0, 3 files / 8 tests.
- `pnpm --filter @stockquant/research-automation-service lint` — exit 0.
- `pnpm --filter @stockquant/research-automation-service build` — exit 0.
- The initial broad Research Automation unit run had 191 passing tests and 3 restricted-egress tests failing to bind loopback (`listen EPERM`). This was an environment permission failure, is retained, and was not represented as a pass. The focused provider/cost suite above does not include those socket tests.

This hardens response memory bounds only. It does not authorize Provider traffic, establish production DNS/egress enforcement, reconcile an invoice, complete RD-Agent, or satisfy V3.1 business, Ubuntu, observation, or user-acceptance gates.

The associated SHA-256 manifest binds the implementation, focused test, architecture description, stage record, and this audit.

The full V3.1 code suite was then run against the current-worktree Research Automation image `sha256:523103f19fa5e492aea8559625e284129a9ee7387ed0423661b30983fc6b1260` (exit 0). It passed contracts, Research Automation 195 unit tests and 27 isolated PostgreSQL integration tests, the 66,100-row read-only capacity probe, fixture model-gateway and production-settlement refusal smokes, the internal-only RD-Agent/LiteLLM chat+embedding Fixture smoke (`externalProviderCalls=0`, two SETTLED rows), Platform 162 unit tests, Artifact owner-scope/evidence-export smoke, and Web typecheck. Isolated Docker resources were cleaned by the suite. The initial unpinned attempt (exit 2) and ordinary-sandbox loopback `EPERM` attempt remain part of the execution history; the exact-digest rerun is the passing result.
