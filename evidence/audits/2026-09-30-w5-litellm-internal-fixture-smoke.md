# W5 LiteLLM internal Fixture smoke

Date: 2026-09-30 (Asia/Shanghai)

## Result

PASS for the local compatibility boundary only. The V3.1 `code` suite completed with exit code 0 after contract generation was refreshed. It ran the pinned LiteLLM client inside an isolated Linux/amd64 Docker container against a test-only OpenAI-compatible endpoint and a temporary PostgreSQL database on a Docker `--internal` network.

The client received both a `chat.completion` and a standard `list` embedding response from model `stockquant-fixture`. Chat content was fixed (`deterministic fixture response`) with usage 12 prompt / 8 completion / 20 total tokens; the two-item embedding result returned the fixed vector `[0.125,-0.25,0.5]` and usage 8 prompt / 8 total tokens. The LiteLLM default embedding request sent `encoding_format: null`; the fixture accepted that default and returned a compatible base64 vector which LiteLLM parsed back to the expected floats. Two unique ledger rows settled 23 cents each; the aggregate was `SETTLED,SETTLED|120|120|46|2` (60 cents requested/reserved per call, 46 cents combined Fixture cost, two rows). The run reported `externalProviderCalls=0`.

## Exact inputs and command

- Research Automation image: `stockquant-v31-research-openai-fixture:local`
- Research Automation image ID: `sha256:fd25ae7b39afe2a89ed89c7618da73e93724f70af5db34e533c82aacbe84a73f`
- LiteLLM/RD-Agent dependency image: `stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593-offline-3`
- LiteLLM image ID: `sha256:eb9030b8107c79c3554dabc68322814b81c04564bb0a1e5a9841bd603a67ccf1`
- PostgreSQL image: `postgres:16.9-alpine`
- Command: `STOCKQUANT_RESEARCH_IMAGE_REF=stockquant-v31-research-openai-fixture:local STOCKQUANT_RESEARCH_IMAGE_ID=sha256:fd25ae7b39afe2a89ed89c7618da73e93724f70af5db34e533c82aacbe84a73f pnpm verify:stage -- --stage V3.1 --suite code`
- The endpoint requires `NODE_ENV=test` and `STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE=true`; outside this explicit test configuration it returns 404. Streaming requests are rejected. The temporary service token and database password are random per run and not persisted.

## Verification included

- Contracts: 171 JSON files, 112 schemas, 36 fixtures, 94 compatibility consumer rules; all passed.
- Research Automation: lint/build passed; 31 unit test files / 168 tests passed; 4 PostgreSQL integration files / 19 tests passed.
- Contracts: 173 JSON files, 114 schemas, 36 fixtures and 96 compatibility consumer rules passed.
- Research Automation: lint/build passed; 31 unit test files / 169 tests passed; 4 PostgreSQL integration files / 20 tests passed.
- Host PostgreSQL HTTP smoke passed for chat and embedding response schemas, evidence recording, budget settlement and duplicate-call rejection.
- Internal-network LiteLLM chat + embedding client-to-service-to-ledger smoke passed. Final test run IDs: experiment `45fd6a50-46c3-4e66-8650-8b60040707a4`; chat `litellm-b7558bac-812b-42f3-8d66-83a5f32531ed`; embedding `litellm-embedding-b76c0ae5-7d29-4085-a7ef-db17f77d7729`.
- Platform API: typecheck passed; 26 unit test files / 94 tests passed.
- Artifact owner-scope HTTP smoke passed (`testRunId=d595de86-cec9-48fa-acf1-54c29185214f`, `activeServicesTouched=false`).
- Web typecheck passed.
- `pnpm docs:check` and `git diff --check` passed after this evidence document was added.
- Post-run inspection found no Docker container or network whose name starts with `sq-litellm-`; the smoke removes its temporary service, PostgreSQL container and internal network in `finally`.

## Boundary and remaining gaps

This does not run an RD-Agent experiment and does not establish the production controller-to-gateway path. It does not call a real model or market-data provider, reconcile an invoice, prove provider rights, enforce production DNS/egress policy, cap RD-Agent continuation loops, or constitute human acceptance. The user's current authorization remains `NO_TRADE` with no data-source authorization. W5 and V3.1 therefore remain incomplete; production model readiness must remain blocked.
