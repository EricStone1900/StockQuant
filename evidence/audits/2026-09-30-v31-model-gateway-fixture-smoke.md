# V3.1 model-gateway Fixture HTTP/PostgreSQL regression (2026-09-30)

## Result

`pnpm --filter @stockquant/research-automation-service model-gateway:fixture-http-smoke` exited 0 after the smoke script was updated to accept an explicit loopback PostgreSQL port. It built Research Automation and started a local HTTP service against a newly created, disposable PostgreSQL 16.9 database. PostgreSQL was exposed only on a randomly selected `127.0.0.1` port; the fixture process did not connect to the active `stockquant-v12_postgres-1` container. The temporary PostgreSQL container and Docker network were removed after the run.

Assertions passed:

- Real-provider preflight remained `BLOCKED`; a `runner-host` caller was denied.
- A fixed Fixture reply reserved and durably dispatched before completion, settled exactly 23 cents, and replaying the same request returned `ALREADY_EXISTS` without another provider dispatch.
- A fixed timeout remained `UNKNOWN`, retained its full 50-cent reservation, refused retry under a new run id when the experiment budget was exhausted, and did not issue another provider request.
- A Fixture response claiming more than its 40-cent reservation remained `UNKNOWN` with the full reservation held.
- Output identified `provider=FIXTURE` and `externalCalls=0`.

## Attempt history and limits

The first attempt used an internal-only Docker network. Docker Desktop allowed the container health check but did not make its published port reachable from the host process; the HTTP smoke failed with `ECONNREFUSED`. That exact temporary container and network were removed. The successful run used a normal disposable bridge network but bound PostgreSQL's published port to loopback only. The tested application path had no real Provider adapter enabled and its provider was the fixed Fixture implementation; no external provider or market data was called.

This is an isolated integration regression for the Fixture budget/coordinator path. It does not prove real-provider egress isolation, provider billing reconciliation, RD-Agent execution, Paper continuity, Ubuntu behavior, or human acceptance. V3.1 stays `NOT_RUN`.
