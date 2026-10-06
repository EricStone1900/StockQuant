# W5/W1 V3.1 Artifact clock change: full code suite

Date: 2026-10-03 (Asia/Shanghai)

The artifact reconciliation command now captures one operation timestamp and passes it through age filtering and quarantine manifest generation. The focused reconciliation tests assert the exact `observedAt` value. The code suite was run against a dedicated current-worktree Research Automation image, pinned by digest, using isolated temporary infrastructure.

- Command: `STOCKQUANT_RESEARCH_IMAGE_REF=stockquant-v31-research-openai-fixture:codex-20261003-artifact-clock STOCKQUANT_RESEARCH_IMAGE_ID=sha256:ddcf6361499ecbd2f018f7b5ea34984aebb2eaa009b43320ca0c9c73467388fa pnpm verify:stage -- --stage V3.1 --suite code`
- Result: exit 0. Research Automation: 36 unit files / 202 tests and 4 integration files / 27 tests; Platform API: 46 unit files / 166 tests; contract validation and generated clients passed; queue probe used 66,100 synthetic rows.
- Internal RD-Agent v0.8.0/LiteLLM Fixture smoke: Chat and Embedding completed on an internal-only network; two budget rows settled at 46 cents total, external provider calls 0.
- Artifact owner-scope HTTP smoke: `testRunId=faf7a9cd-80f3-4618-bf9e-b22e37863c5d`; exact input/output bytes and manifest hash verified, wrong owner denied, synthetic acceptance only. `activeServicesTouched=false`.
- Research image: `linux/arm64`, digest `sha256:ddcf6361499ecbd2f018f7b5ea34984aebb2eaa009b43320ca0c9c73467388fa`. The suite's temporary LiteLLM containers/network were removed; read-only Docker inspection found no matching containers afterward.
- Full output: [captured suite log](2026-10-03-w5-v31-artifact-clock-code-suite.log). Machine results and file hashes are in the adjacent JSON and SHA-256 manifest. After verification, the dedicated test image was deleted by digest; no matching temporary containers remained.

A first attempt without the exact image digest stopped at the suite prerequisite (exit 2); it is retained in the turn execution history, and the pinned rerun above passed. This validates an isolated Fixture integration slice only. It does not authorize external providers, prove real RD-Agent/provider billing, complete V3.1 business acceptance, or satisfy Ubuntu, O1/O2, Paper, or human sign-off gates. Those remain outstanding.
