# W5 V3.1 offline regression refresh

Date: 2026-10-01 (Asia/Shanghai)

Command: `STOCKQUANT_RESEARCH_IMAGE_ID=sha256:4cb517d99727cab1f5001f53dcc11aa0cf2d42ad5ce564e685d5dbc28796a730 pnpm verify:stage -- --stage V3.1 --suite code`

Result: exit 0. The suite used the exact local Research Automation image digest above. Research Automation unit tests passed 171/171 and PostgreSQL integration tests passed 23/23; Platform unit tests passed 116/116; contract generation/checks, the deterministic LiteLLM chat/embedding fixture smoke, owner-scoped artifact HTTP smoke, and Web typecheck passed. The isolated fixture smoke reported `externalProviderCalls=0`, `network=internal-only`, and two settled fixture budget rows. No active services, market-data sources, or trading orders were used.

The first sandbox run could not bind its local HTTP test listener (`EPERM`), and the initial elevated suite lacked its required image digest. Both were environment/setup issues; after reading the exact local digest, the full suite was rerun with loopback and Docker access and exited 0. This is code/Fixture regression evidence only: Provider preflight remains BLOCKED, real RD-Agent→Provider execution, invoice reconciliation, enforceable production DNS/egress controls, V3.1 business validation and human acceptance remain NOT_RUN.
