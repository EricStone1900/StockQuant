# V3.1 compatibility regression after W6 contract freeze

Date: 2026-10-03 (Asia/Shanghai)

The V3.2 promotion-preparation result schema regenerated shared TypeScript and Python contract types. V3.1 was rerun to verify its fixed Runner, model-gateway and Artifact paths remain compatible.

- Initial `pnpm verify:stage -- --stage V3.1 --suite code` stopped at the explicit prerequisite because no current `STOCKQUANT_RESEARCH_IMAGE_ID` was supplied (exit 2). The failure is preserved in the suite log.
- Built a dedicated `linux/arm64` Research Automation image from the current workspace using `services/research-automation-service/Dockerfile`; exact image ID: `sha256:55f2b9a69d80954fc5f753f3d8ddaa2788af385369bcc47bea0e2d62121a365e`.
- Reran the full V3.1 code suite with that exact digest. Exit code 0. Research Automation unit 203/203 and PostgreSQL integration 28/28 passed; Platform unit 166/166 passed. Contracts, budget pagination probe, Fixture Model Gateway, LiteLLM-compatible internal Chat/Embedding, UNKNOWN budget hold/no-retry behavior, and owner-scoped Artifact read/evidence export passed.
- Internal LiteLLM used a pinned Runner image on an internal-only network. `externalProviderCalls=0`; the owner Artifact smoke TestRun was `3a9e7e26-c28d-4b6e-9560-584e87b47e4a`, and reported `activeServicesTouched=false`.

The run proves current-worktree engineering/Fixture compatibility only. It does not prove a real RD-Agent/model call, provider billing, V3.1 business acceptance, Ubuntu, O1/O2, Paper or human sign-off. Those gates remain open. Full command output is in the adjacent `.log`; current relevant source hashes are in `.sources.sha256`.
