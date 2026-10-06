# W5/V3.1 isolated code-suite refresh (2026-10-01)

The first invocation without `STOCKQUANT_RESEARCH_IMAGE_ID` stopped before the internal LiteLLM smoke, as designed. A read-only local Docker image inventory confirmed the exact current Research Automation image already built from the current worktree: `sha256:05a45830f2c15a7643f60ec2f0aa3c4a7250ffd761dabb0d07dbc30d0057ef53`. The suite was rerun with that explicit digest:

```text
STOCKQUANT_RESEARCH_IMAGE_ID=sha256:05a45830f2c15a7643f60ec2f0aa3c4a7250ffd761dabb0d07dbc30d0057ef53 pnpm verify:stage -- --stage V3.1 --suite code
```

The rerun passed. Contract checks passed (211 JSON documents, 146 schemas, 36 fixtures, 100 consumer rules). Research Automation lint passed; its 32 unit files passed 181/181 tests and four PostgreSQL integration files passed 25/25. The isolated V3.3 queue read probe passed over 66,100 synthetic rows; it measures pagination reads only, not dispatched Runner concurrency. The fixed HTTP model gateway reported `provider=FIXTURE` and `externalCalls=0`. The pinned RD-Agent/LiteLLM dependency image connected to the isolated service over an internal-only Docker network; fixed chat and embedding responses and two fixture budget rows passed (`SETTLED,SETTLED|120|120|46|2`), with `externalProviderCalls=0`. Platform typecheck and 153/153 tests passed. Artifact owner-scope HTTP/evidence export passed under a random isolated TestRun, including owner 200, foreign owner 403 and exact input/output/manifest hashes. Web typecheck passed; `activeServicesTouched=false`.

This establishes the current isolated engineering path with deterministic Fixture data. It does not establish a live Provider request, RD-Agent experiment acceptance, invoice reconciliation, production network egress controls, Ubuntu deployment, or human acceptance. Provider authorization remains false; V3.1 remains NOT_RUN at the stage acceptance level.
