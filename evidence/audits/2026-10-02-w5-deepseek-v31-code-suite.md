# W5 DeepSeek bounded-response and V3.1 code-suite audit

Date: 2026-10-02 (Asia/Shanghai)

The DeepSeek adapter now incrementally reads responses up to 8 MiB and cancels an oversized stream. The related unit tests pass with the existing SiliconFlow 16 MiB bounded-stream tests. The fixture-only `model-gateway:fixture-http-smoke` also exposed a test harness race: its child service could start before the harness had created the randomized database. The script now creates the database first, then starts the child. No product runtime behavior or live configuration was changed.

A dedicated current-worktree Research Automation image was built under tag `stockquant-v31-research-openai-fixture:codex-20261002-deepseek-boundary`, image ID `sha256:7e2fc670427c76abe5444cf16723cfa803cde03b0ebe05ec79795b9c681bdbaa`. With that exact ID explicitly pinned, `pnpm verify:stage -- --stage V3.1 --suite code` exited 0. The suite covered contracts, Research Automation lint/build, 196 Research unit tests, isolated PostgreSQL integration, the capacity probe, fixture HTTP gateway and production settlement refusal, the internal-only RD-Agent v0.8.0/LiteLLM chat+embedding Fixture smoke, Platform tests, Artifact owner-scope/evidence-export HTTP smoke, and Web typecheck.

Execution history is retained: the first full suite exposed the database-creation race; after that fix a second run correctly refused to use an unpinned stale image; the final run used the new exact digest and passed. The isolated test containers and networks were cleaned by the suite. The dedicated image was removed after recording its digest.

External Provider calls: 0. Market-data calls: 0. Active services touched: no. Provider call authorization remains false. No credentials were read.

This closes only the code-suite verification of the response boundary and fixture harness change. It does not prove production Provider runtime wiring, forced production egress, invoice reconciliation, real RD-Agent business execution, Ubuntu acceptance, observation or user sign-off. V3.1 and V3 remain incomplete.
