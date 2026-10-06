# W1 V2.1 Market Data read client audit

Date: 2026-10-01 (Asia/Shanghai)

## Change

The Platform V2.1 controller now uses the generated Market Data client for eleven operations: seven GET operations (source inventory, sampling, watchlist, deterministic news preview, active source smoke, live quote and live news), sampling/watchlist PUT, and source circuit fail/recover POST. Their request/response schemas and ServiceBearer OpenAPI operations are in `packages/contracts/`. `scripts/generate-v21-market-data-client.mjs` checks operation IDs, ServiceBearer and response schemas and generates the Platform client. The routes continue to validate the local user session before forwarding the Platform service identity.

The inventory, sampling, watchlist and static news preview operations make no external provider request. Source smoke, live quote and live news can contact providers; tests exercised these paths only through mocked fetch. Sampling/watchlist writes and circuit controls also ran only against mocked fetch. No live provider or active service was contacted. User direction remains `NO_TRADE`, with no source authorization.

## Verification

- `pnpm --filter @stockquant/platform-api-service lint`: PASS.
- `pnpm --filter @stockquant/platform-api-service test`: PASS, 38 files / 129 tests.
- `pnpm contracts:check`: PASS; JSON and schema validation, generated-client drift checks, compatibility checks and OpenAPI checks.
- `pnpm docs:check`: PASS, 1,631 local Markdown links.

An initial full unit run failed because `v21-acceptance-auth.spec.ts` expected the previous raw-fetch argument shape. The assertion now checks the exact URL and bearer header while allowing the client's timeout signal; the complete suite then passed. This failed run is retained here for transparent regression history.

## Limits

This is a client-boundary engineering increment only. It does not validate source licensing, provider connectivity, live-data quality, active Compose deployment, V2.1 browser acceptance, or human sign-off. V2.1 and W1 remain incomplete.
