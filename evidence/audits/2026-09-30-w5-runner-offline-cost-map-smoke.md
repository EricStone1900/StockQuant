# W5 offline LiteLLM cost-map Runner check

Date: 2026-09-30 (UTC)

## Change

The pinned RD-Agent v0.8.0 dependency imports LiteLLM, whose default cost-map loader may attempt DNS for a mutable remote map. The isolated Runner image sets `LITELLM_LOCAL_MODEL_COST_MAP=True`. The Runner passes a fixed, non-secret setting set through its child process's minimal environment: prompt/response content logging, chat and embedding caches, cache dumps, and streaming are disabled, and each underlying completion/embedding attempt is limited to one try. The smoke verifies effective values on both RD-Agent's base and LiteLLM settings objects. Provider credentials remain absent, the Runner remains `network=none`, and no real Provider/model request was made.

## Build and verification

- Image: `stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593-offline-3`
- Image ID: `sha256:eb9030b8107c79c3554dabc68322814b81c04564bb0a1e5a9841bd603a67ccf1`
- Build: `docker buildx build --pull=false --platform linux/amd64 --file services/research-automation-service/runner/Dockerfile --tag stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593-offline-3 --load .` — exit 0. Pinned apt/dependency/source layers were reused from the previous image build.
- Import: `docker run --rm --platform linux/amd64 --network none --read-only --cap-drop ALL --security-opt no-new-privileges --user 10001:10001 --entrypoint python <image> -c 'import litellm; print("LOCAL_COST_MAP_IMPORT_OK")'` — exit 0, marker observed with networking disabled.
- `pnpm v31:runner-smoke` with `STOCKQUANT_RUNNER_IMAGE_REF` and `STOCKQUANT_RUNNER_IMAGE_ID` bound to this exact image — exit 0, six cases PASS: normal output copy (including effective settings assertions), Runner timeout, path rejection, 128MiB OOM, read-only root/input and isolated writable output, and host-timeout daemon cleanup. Linux/amd64 was emulated on Mac ARM64.
- The first smoke attempt caught that the Runner's child environment scrubber omitted the fixed offline setting. The setting was added to the explicit minimal environment. Later assertions now verify actual Pydantic settings values for both base and LiteLLM config; the complete smoke passed.

## Limits

This validates image import and Runner isolation only. It does not integrate RD-Agent's LiteLLM requests with the trusted usage ledger, disable RD-Agent's upstream six-iteration long-answer auto-continuation loop, establish network egress policy, reconcile Provider invoices, grant source rights, authorize real model calls, or pass W5/V3.1 acceptance. All real Provider calls remain disabled under the user's current NO_TRADE / no-source-authorization decision.
