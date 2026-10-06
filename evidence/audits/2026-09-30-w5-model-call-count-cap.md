# W5 per-experiment model-call count ceiling

Date: 2026-09-30 (Asia/Shanghai)

## Result

Implemented a hard ceiling of 12 distinct model-call IDs per V3.1 experiment. An existing `modelRunId` remains idempotent and does not consume another slot; a new ID after the ceiling is rejected while still RESERVED, before provider dispatch. REJECTED reservations do not consume a slot. PostgreSQL serializes the check under the existing stage lock. The ceiling is saved in `research_budget_stage_limits` and checked on initialization and each transaction, so a process cannot silently restart with a different value.

The schema update is additive: existing stage-limit rows get a default of 12. The in-memory ledger uses the same default; tests may inject a lower cap to exercise the boundary.

## Verification

- Research Automation lint/typecheck passed.
- Unit tests: 31 files / 169 tests passed, including a boundary test that settles two calls and rejects the third under a test cap of 2.
- Isolated PostgreSQL integration: 4 files / 20 tests passed, including persistence across initialization and refusal to reopen the same stage with a different cap.
- Rebuilt Research Automation container image: `stockquant-v31-research-openai-fixture:local`, final ID `sha256:fd25ae7b39afe2a89ed89c7618da73e93724f70af5db34e533c82aacbe84a73f`. Its build passed 31 files / 169 unit tests.
- Full `STOCKQUANT_RESEARCH_IMAGE_REF=stockquant-v31-research-openai-fixture:local STOCKQUANT_RESEARCH_IMAGE_ID=sha256:fd25ae7b39afe2a89ed89c7618da73e93724f70af5db34e533c82aacbe84a73f pnpm verify:stage -- --stage V3.1 --suite code` completed successfully with exit code 0. It ran contract checks, Research Automation lint/unit/PG integration, host PostgreSQL Fixture HTTP smoke, internal pinned LiteLLM Chat/Embeddings smoke, Platform typecheck/unit, Artifact owner-scope smoke and Web typecheck.
- The internal LiteLLM smoke reported `externalProviderCalls=0`, fixed chat and embedding results, and the expected two-row Fixture settlement. No active service was touched.

## Limits

This bounds the number of distinct gateway reservations. It does not yet prove RD-Agent's actual continuation loop uses this gateway, nor does it bound or reconcile external Provider spending unless the production controller is wired to it. Production Provider remains blocked, external model calls remain unauthorized, and V3.1 human acceptance remains NOT_RUN.
