# V2.1 isolated stack smoke — 2026-10-17

## Scope

Verify the V2.1 isolated Compose entrypoint only: configuration, source-authorization fail-closed settings, container startup/readiness and exact-project shutdown. This is not V2.1 business acceptance or user acceptance.

## Execution

- Start: `node scripts/stack-up-v21-interactive.mjs` (same implementation as `pnpm stack:up -- --stage V2.1`), exit 0.
- Isolated Compose project: `sq-v21-stack-daf37565efb32504c687`.
- Web: `http://127.0.0.1:63599/acceptance/v2/v2.1`.
- Platform API: `http://127.0.0.1:63594`.
- Market Data: `http://127.0.0.1:63577`.
- Readiness: Platform `/live`, Market Data `/live` and the containerized V2.1 Web route returned success.
- Source authorization: quote, news, research and collection all forced `false`; Market Data container did not receive the workstation `.env.local` file.
- Trading boundary: FakeBroker; LIVE trading disabled.
- Stop: `pnpm stack:down -- --project sq-v21-stack-daf37565efb32504c687`, exit 0; result `STOPPED_AND_PURGED`.
- Exact-project post-check: containers=0, volumes=0, networks=0, images=0.
- Human acceptance: `NOT_RECORDED`.

The dynamic URLs are historical smoke outputs; each invocation selects new loopback ports. Use the URLs printed by the current invocation.

## Limits

This smoke does not run the V2.1 normal/rejection/recovery business scenarios, code suite or browser tests. It does not exercise any provider or establish source licensing/capability. The stage runbook remains `DRAFT_NOT_EXECUTABLE` until those remaining instructions and checks are made concrete and verified.
