# W1 generated client registry audit

Date: 2026-10-02 (Asia/Shanghai)

## Finding and change

A repository scan found that `generate-candidate-mandate-client.mjs` was in `contracts:generate` but omitted from `contracts:check`. This allowed its generated consumer file to drift without the canonical contract check reporting it. Added the missing drift check and a registry guard that discovers every `generate-*-client.mjs` script and requires it to appear in both root commands. Added positive and negative tests so a future client generator cannot silently miss generation or drift validation. Updated the contract guide to reflect current V2.4, Promotion submit and Runner Host generated clients; remaining raw service-to-service GETs are readiness probes.

## Verification

- `pnpm contracts:check`: PASS; 24 client generators registered, 2 new registry tests PASS, generated OpenAPI/type checks PASS.
- Full `pnpm baseline:check`: PASS after root script change; 2086 Markdown links, 211 JSON files / 146 schemas / 36 Fixtures, generator drift and compatibility checks, eight service-layer scans and 20 architecture/version-gate tests.
- No service runtime, source provider, Paper flow or active environment was contacted.

## Boundary

This closes generator registration consistency only. It does not publish packages to a registry, deploy changed clients, perform active API cutover/rollback, or complete any stage/business acceptance.
