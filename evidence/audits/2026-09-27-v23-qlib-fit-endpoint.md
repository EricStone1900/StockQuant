# V2.3 Qlib Fixture Fit endpoint audit (2026-09-27)

## Outcome

Added a bounded, explicit-FIXTURE Qlib training endpoint to the Qlib Worker and a platform-only proxy at `POST /v1/research/qlib/fit-fixture`. Request/result JSON Schemas, an OpenAPI operation, a fixed request fixture, generated consumer types, and compatibility rules are checked by the normal contract tooling. The proxy authenticates the inbound platform caller and uses a separate `STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE` Bearer credential plus the matching service ID for the Worker hop. Requests are limited to 1 MiB; the Worker enforces finite numeric inputs, feature dimensions, contiguous train/validation/test windows, minimum window sizes, and the fixed `sourceMode=FIXTURE` contract.

The Worker built from the repository's pinned Qlib Worker lock and ran in a disposable `linux/amd64` container emulated on Apple Silicon. Container limits were network-none, read-only root, 2 GiB memory, 1 CPU, 128 PIDs, and 256 MiB `/tmp`. Two successive requests each executed Qlib 0.9.6 `qlib.contrib.model.gbdt.LGBModel.fit` and test-segment prediction against the same deterministic 120-row synthetic in-memory dataset (72 train, 24 validation, 24 test). LightGBM was 4.7.0 with 3 rounds and one thread. Both runs produced 24 finite predictions and identical hashes:

- Prediction SHA-256: `09d1563ed1102a87f6e71672e9b1238ce844094aa336cb33efeea6ac995bdbe3`
- Model SHA-256: `08d29ca3ccefc37e887928d5a4512a9f63d53edef6cc91b4289e1731ec675695`
- Overlapping validation/train split: HTTP 422.
- Worker returned `modelTraining=PASS`, `modelValidation=NOT_RUN`, `candidateSourceExecution=NOT_PERFORMED`, `profitabilityClaim=NOT_MADE`.

`pnpm --filter @stockquant/quant-research-service test:integration` passed using random isolated PostgreSQL and a loopback Worker stub. It verified that only the authenticated platform route reaches the Worker, the proxy supplies its distinct Worker Bearer identity, and the response is forwarded. Existing candidate/PromotionRequest integration checks passed. `pnpm --filter @stockquant/quant-research-service test:worker` passed 11 tests. `pnpm baseline:check` passed: Markdown links 757/757, 99 JSON files, 52 schemas, 34 fixtures, 39 compatibility consumer rules, seven OpenAPI groups, and frozen fixture hashes. The actual Qlib container command `pnpm --filter @stockquant/quant-research-service qlib:fit-smoke` passed and removed its exact temporary image in `finally`.

## Limits

This is an engineering/runtime proof on synthetic rows. The Qlib request does not load a market-data manifest or a frozen market-data Fixture, cannot run candidate source, and does not persist a business job or artifact. It does not prove point-in-time integrity against a real dataset, independent candidate validation, V2.3 research Web/CLI acceptance, V3.2 PromotionRequest/report production, V3.1 prerequisites, Registry transition, profitability, 20-day observation, Ubuntu-native execution, or human acceptance. The result is not substituted for any of those gates. The Worker image pins package versions but does not yet enforce hashes for every dependency artifact. The running Compose service was not rebuilt, restarted, or deployed; `.env.example` remains blank and no token value was written to tracked files.

The temporary test database and container image were removed; no activity container or shared database/volume was changed.
