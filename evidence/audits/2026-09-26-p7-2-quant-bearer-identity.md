# Quant service token-derived identity correction

Date: 2026-09-26 (Asia/Shanghai)

## Finding and change

The quant service was still selecting the expected credential from `x-stockquant-service-id`, even though the project owner selected one independent Bearer token per service and that header is only suitable as a consistency check. A caller could not omit the legacy header and have the quant service derive its identity from the credential. The quant service now matches the Bearer token against its configured, unique service credentials, derives the caller from that match, and rejects a supplied service header when it disagrees. Existing per-caller route scopes are unchanged.

## Verification

- `pnpm --filter @stockquant/quant-research-service test`: PASS, 21/21 unit tests; includes Bearer-only platform probe, Bearer-only replay scope, and forged-header rejection.
- `pnpm --filter @stockquant/quant-research-service build`: PASS.
- `pnpm --filter @stockquant/quant-research-service test:integration`: PASS against random isolated PostgreSQL databases; candidate registration and immutable PromotionRequest assertions passed.
- `node scripts/service-auth-http-smokes.mjs`: PASS, 15 route assertions across governance, replay and quant, including Bearer-only platform access (200) and mismatched identity header denial (403).
- `pnpm verify:stage -- --stage V3.2 --suite code`: PASS. It reports business validation and human acceptance as `NOT_RUN`, and performs no Registry mutation.
- `pnpm docs:check`: PASS, 613 local links; `git diff --check`: PASS.

No active quant container was redeployed. No model call, research run, Registry transition, trade, or human acceptance was performed. V3.2 remains NOT_RUN and this change does not provide independent candidate recomputation.
