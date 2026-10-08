# P1 V1.2 isolated interactive stack

Date: 2026-10-07 (Asia/Shanghai)

This audit covers the V1.2 interactive stack lifecycle slice only. It does not create a TestRun and does not change business or human acceptance status.

`pnpm stack:up -- --stage V1.2` started Compose project `sq-v12-e2e-b87f1147412471aea9e3`. The Web URL was `http://127.0.0.1:55041/acceptance/v1/v1.2` and returned HTTP 200. Platform API `http://127.0.0.1:45112/live` returned `{"status":"live","service":"platform-api-service"}`. Compose reported healthy PostgreSQL, Market Data, Qlib worker, Quant Research, Governance, Platform API, and Web containers. Runtime was `brokerMode=FAKE`, `liveTradingEnabled=false`, and market-source authorization was NONE.

Random credentials and stack metadata were stored in `.codex/isolated-stacks/` with mode 0600; that directory is ignored by Git. `pnpm stack:down -- --project sq-v12-e2e-b87f1147412471aea9e3` wrote the private stop marker. The running harness then removed only this Compose project, its PostgreSQL/artifact volumes, network, and project-tagged images. The harness reported `MANUAL_STACK_CLEANUP_VERIFIED` with zero containers, volumes, networks, and project images, and `humanAcceptance=NOT_RECORDED`. Independent Docker label queries and a filesystem check confirmed no project resources or credential/state files remained.

Validation: `node --check` passed for `scripts/stack-up.mjs`, `scripts/stack-down.mjs`, and `scripts/test-v12-e2e-isolated.mjs`; `pnpm docs:check` checked 4,874 local links with zero failures; `git diff --check` passed. This is an environment lifecycle check, not a V1.2 business E2E or user acceptance. The original P1 requirement for interactive environments across all five V1 stages remains open.

Known implementation boundary: V1.2 `stack:down` requests graceful cleanup through a private stop marker observed by its foreground harness. If the harness does not remove its registration within 120 seconds, the command falls back to Compose down scoped to the exact registered project.
