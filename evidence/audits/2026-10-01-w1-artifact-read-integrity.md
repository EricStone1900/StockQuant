# W1 Research Artifact read-integrity check

Date: 2026-10-01. Scope: strengthen the existing Research Automation content-store boundary without changing storage layout, lifecycle policy, or active service.

## Change

`FileArtifactStore.read` now recomputes SHA-256 from the bytes read and refuses to return content when it does not match the immutable `ArtifactRef.sha256`. The Platform HTTP route already performed its own integrity check; this moves the guarantee down to the shared Research Artifact storage port so Runner input, promotion preparation, and future consumers receive the same behavior. A regression test publishes valid content, tampers with the persisted file, then verifies the store rejects the read.

## Verification

- Research Automation lint/typecheck and build: PASS.
- Research Automation unit tests: 178/178 PASS, including the new on-disk corruption case.
- Research Automation isolated PostgreSQL integration tests: 25/25 PASS.
- The first V3.1 complete code-suite attempt exited 2 because `STOCKQUANT_RESEARCH_IMAGE_ID` is a required exact-image precondition. The earlier image also lacked this code change, so it was not reused.
- Rebuilt the isolated `linux/arm64` Research Automation image from current worktree with the repository-locked dependencies; exact image ID `sha256:05a45830f2c15a7643f60ec2f0aa3c4a7250ffd761dabb0d07dbc30d0057ef53`. The image build itself ran 178/178 unit tests.
- `STOCKQUANT_RESEARCH_IMAGE_ID=sha256:05a45830f2c15a7643f60ec2f0aa3c4a7250ffd761dabb0d07dbc30d0057ef53 pnpm verify:stage -- --stage V3.1 --suite code`: exit 0. Research unit 178/178, isolated PG integration 25/25, exact image-pinned internal LiteLLM chat/embedding and budget settlement PASS, Platform unit 143/143, Artifact owner-scope HTTP/export PASS, Web typecheck PASS. Internal model fixture reported `externalProviderCalls=0`. Artifact smoke TestRun `d6cc0d53-5d3a-4879-a275-cb60687b2a51`; artifact hash verification and manifest succeeded.
- Image build and suite used isolated test resources; report states `activeServicesTouched=false`. No active service, data source, broker, or external model was used.

## Limits

This is engineering integrity coverage, not the unresolved shared physical Artifact backend, approved retention duration/physical cleanup, real RD-Agent, V3.1 business acceptance, active deployment, Ubuntu, or human sign-off. Existing artifacts and history are unchanged.
