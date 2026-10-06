# W5 V3.1 isolated code suite rerun — 2026-10-01

Command:

```sh
STOCKQUANT_RESEARCH_IMAGE_REF=stockquant-v31-research-openai-fixture:local \
STOCKQUANT_RESEARCH_IMAGE_ID=sha256:fd25ae7b39afe2a89ed89c7618da73e93724f70af5db34e533c82aacbe84a73f \
pnpm verify:stage -- --stage V3.1 --suite code
```

Result: exit 0. Contract checks passed (173 JSON documents, 114 schemas, 36 fixtures, 96 compatibility rules). Research Automation TypeScript lint/build, 169/169 unit tests and 20/20 isolated PostgreSQL integration tests passed. The host PostgreSQL Fixture HTTP smoke passed with `externalCalls=0`. The pinned Research Automation image and pinned Linux/AMD64 LiteLLM client ran on an internal-only Docker network; chat and embeddings returned the deterministic Fixture responses and both budget rows settled (`SETTLED,SETTLED|120|120|46|2`), with `externalProviderCalls=0`. Platform typecheck, 99/99 unit tests and Artifact owner-scope HTTP smoke passed; Web typecheck passed. The smoke reports `activeServicesTouched=false` and labels its acceptance as synthetic test data.

The first attempt in this turn used the older digest `sha256:ee910c7b...` and was rejected before the Docker network or containers were created. The digest was checked against the current local image and existing W5/W8 audit, then the exact current digest above passed. This attempt history is retained; the successful rerun is the verification result.

This is isolated code and Fixture evidence only. It does not complete W5 or V3.1: no real RD-Agent experiment, real Provider call, source authorization, market data, Paper trading, Ubuntu host run, or human acceptance occurred. Existing `NO_TRADE` and no-source-authorization constraints remain in force.
