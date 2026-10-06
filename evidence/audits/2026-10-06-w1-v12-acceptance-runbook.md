# V1.2 acceptance handoff and TestRun evidence alignment

Date: 2026-10-06 UTC. This audit records the existing isolated V1.2 run and repairs the evidence layout so the version gate can find it. It does not record human acceptance.

## Verified facts

- `pnpm v12:acceptance` started isolated project `sq-v12-e2e-55c064b1873aae3789bd`; startup output identified Web `http://127.0.0.1:52494/acceptance/v1/v1.2`, Platform API `http://127.0.0.1:49408`, `sourceAuthorization=NONE`, `liveTradingEnabled=false`, and `brokerMode=FAKE`.
- The local acceptance API created normal TestRun `890f3fab-e689-471b-8c45-97abd531d3d5`, status `COMPLETED`, with 3/3 assertions `PASS`: fixture quality/count, Qlib probe readiness, and factor preview.
- CLI check-only against the same Platform API and TestRun exited 0. The evidence export command exited 0 and originally produced manifest SHA-256 `eb64421c310769203ca64b1135d4092681a06c8ba440a004f31d6ebaa22caf19`.
- Inspection found the V1 exporter selected `evidence/local/<runId>`, while the version gate requires `evidence/local/V1.2/<runId>`. The persisted API response was normalized into the required top-level `stageId`/`testRunId` envelope without changing nested TestRun facts or `manualConclusion=NOT_RUN`, then stored at the canonical stage-scoped path with a regenerated manifest. The exporter now writes future V1 stage bundles to the canonical path and binds exact stage/run identity; these cases are covered by the exporter test suite.
- The manual stack received SIGINT. Its parent exited before reporting its own finally verification, so the exact project was brought down with the Compose command used by the harness. A subsequent read-only check found no matching containers, volume, or network.

## Reproduction and evidence

The historical CLI check command was `STOCKQUANT_PLATFORM_API_URL=http://127.0.0.1:49408 pnpm verify:stage -- --stage V1.2 --run 890f3fab-e689-471b-8c45-97abd531d3d5 --check-only` (exit 0). The export command used the same API URL, the isolated local owner session cookie, and `--stage V1.2` (exit 0). The structured bundle is [evidence.json](../local/V1.2/890f3fab-e689-471b-8c45-97abd531d3d5/evidence.json), with manifest [manifest.sha256](../local/V1.2/890f3fab-e689-471b-8c45-97abd531d3d5/manifest.sha256).

Current exporter regression: `node --test scripts/evidence-export.test.mjs` passed after adding V1 path and identity-envelope coverage. Documentation and version evidence checks are rerun after this record and the structured bundle are finalized.

## Acceptance boundary

The evidence bundle states `manualConclusion=NOT_RUN`. The historical 2026-09-09 V1.2 signoff remains limited to its original scope. This run is automated Fixture/FAKE evidence on the local ARM64 Docker environment, not real-market-data validation, Ubuntu x86_64 acceptance, or V1 version completion. Source authorization remains NONE and LIVE trading remains disabled.
