# W1 Runner Host artifact publish generated client audit

Date: 2026-10-02 (Asia/Shanghai)

## Change

The cross-service call inventory found Runner Host output publication still assembled with handwritten `fetch`, while claim, input, heartbeat and completion used the generated client. Added `POST /v1/artifacts/publish` to the Runner Host OpenAPI contract and generated `publishRunnerOutputArtifact`. The Host application now uses that client; the operation carries the dedicated Runner Host Bearer identity, typed publish command/result, lease proof and a 30-second timeout for bounded output uploads. Existing 8 MiB and SHA-256 checks remain before network I/O, and HTTP 409 still maps to `RunnerLeaseLostError`.

## Verification

- `pnpm contracts:check`: PASS; Runner Host OpenAPI client drift check covers all five operations.
- Research Automation lint/typecheck: PASS; unit suite: 32 files / 182 tests PASS.
- Full `STOCKQUANT_RESEARCH_IMAGE_ID=sha256:05a45830f2c15a7643f60ec2f0aa3c4a7250ffd761dabb0d07dbc30d0057ef53 pnpm verify:stage -- --stage V3.1 --suite code`: exit 0.
- The isolated suite included PostgreSQL and service identity checks, fixed-image internal LiteLLM/RD-Agent smoke, Platform 44 files / 153 tests, artifact owner-scope HTTP smoke, and Web typecheck. External Provider calls: 0; active services touched: false.
- The first unprivileged run was blocked by sandbox `listen EPERM` on loopback; the controlled local rerun passed. An intermediate fixed-image invocation without the required image-id environment variable exited 2 before completing; the final invocation with the pinned image-id exited 0.

## Boundary

This verifies the generated client and isolated code path only. It does not publish to the active service, run a real RD-Agent/model call, satisfy V3.1 business scenarios, or record human acceptance. W1 still has remaining cross-service client inventory, shared Artifact lifecycle/policy, active API cutover/rollback and acceptance work.
