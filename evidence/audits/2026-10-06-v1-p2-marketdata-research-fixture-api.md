# V1.2 Market Data Fixture API and Web preview — 2026-10-06

Status: isolated API/contract/Web preview PASS; the actual Qlib strategy-output path remains pending.

The frozen `v1.2-market-data-4` dataset is now served by Market Data at `GET /v1/fixtures/research-preview`. The service verifies the daily-bar bytes against the fixture manifest before returning them. The route requires the Platform service Bearer identity, has a generated OpenAPI client and a schema-bound response. The Platform API exposes it only to the owner-scoped V1.2 page, which shows version, market count and bar count.

`pnpm verify:stage -- --stage V1.2 --suite code` exited 0. This included schema/generator drift and OpenAPI checks, Market Data and Platform builds/tests, the `isProtectedPlatformApiRequest` regression assertion, Qlib worker smoke, and the Web E2E that reads `v1.2-market-data-4`, 13 securities and 774 bars through the Platform API. The browser-created normal/rejection/recovery TestRun IDs were `43574514-e61d-46e0-aecd-469c6ffaffb7`, `e7924db9-ffdb-41dc-8a85-acc02aebb507`, and `4093d5dc-431f-43d4-ab73-c614baf3dadb`; the same IDs were checked by read-only CLI. The normal TestRun remains `WAITING` / NOT_RUN for factor output. Temporary Compose project `sq-v12-e2e-70f8d851351bfee6c778` was removed with its database volume/network and containers.

This proves the Fixture is available through the correct service boundary and Web. It does not yet construct the Qlib fit request from these bars, persist strategy output Artifacts, or independently recompute the returned ranking. No external providers, model APIs, or real brokers were called; no active volumes were touched.

Full log: [suite output](2026-10-06-v1-p2-v12-research-api-suite.log), SHA-256 `c50702e951f3cbc711f5146d9ac1f82431ba3dde95539e3058fd7e908e393847`.
