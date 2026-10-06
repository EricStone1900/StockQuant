# W5 V3.1 fixture-only isolated code suite

Date: 2026-10-03 (Asia/Shanghai)

Command: `node scripts/run-isolated-postgres-command.mjs --url-env RESEARCH_AUTOMATION_DATABASE_URL:research_automation:research_automation_test --url-env PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test -- pnpm verify:stage -- --stage V3.1 --suite code`, with `STOCKQUANT_RESEARCH_IMAGE_ID=sha256:5a6177721fb5623ac75dbfa5da317c509f3a47d9e1802a84d0198c06adaa51f2`.

The V3.1 code suite exited 0. It used the current pinned local research Fixture image `sha256:5a6177721fb5623ac75dbfa5da317c509f3a47d9e1802a84d0198c06adaa51f2` and RD-Agent/LiteLLM offline runner `sha256:eb9030b8107c79c3554dabc68322814b81c04564bb0a1e5a9841bd603a67ccf1`. A read-only image inspection confirmed those digests before execution. The model-gateway smoke reported `provider=FIXTURE`, `externalCalls=0`; the pinned internal LiteLLM smoke reported `externalProviderCalls=0` and used the deterministic fixture response. Budget/settlement fixture boundary reported no external calls and `activeServicesTouched=false`.

Research Automation and Platform API used databases in one random, disposable PostgreSQL container and an isolated no-masquerade Docker network. The runner confirmed both were removed. The artifact owner-scope/export smoke created TestRun `729fbc7a-ec4f-421d-b884-58b25be79c19`; it verified exact input/output byte hashes, owner read 200, foreign-owner 403, evidence export, and that synthetic acceptance did not change the real user gate. `activeServicesTouched=false`.

This proves the current offline engineering/Fixture boundary only. It does not run a genuine RD-Agent research job against an authorized external model, reconcile an invoice, validate a production egress/DNS allowlist on Ubuntu, or establish user acceptance. No credentials were read and no provider or broker request was made. W5/V3.1 remains incomplete.
