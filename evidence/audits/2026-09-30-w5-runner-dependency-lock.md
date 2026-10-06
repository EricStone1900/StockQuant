# W5 Runner runtime dependency lock audit

Date: 2026-09-30

## Outcome

The V3.1 Linux/AMD64 CPython 3.11 Runner image now installs the frozen RD-Agent v0.8.0 and Qlib source commits together with a complete hash-pinned Python dependency graph. This repairs an image-build gap: the previous Dockerfile installed a small manually maintained PyPI lock and then installed both Git projects with `--no-deps`, omitting RD-Agent's declared runtime dependencies including LiteLLM and OpenAI.

## Reproducible inputs

- RD-Agent: `274e274d5dbb72cc2ea139d1a7c93d73ce9b1198`.
- Qlib: `3e72593b8c985f01979bebcf646658002ac43b00`.
- Target: `linux/amd64`, CPython 3.11; 348 packages resolved by uv.
- `services/research-automation-service/runner/uv.lock` SHA-256: `08488fb67e7ebf366fe9b63682574555087bd7b975ca3c334641a6f656fbe023`.
- `services/research-automation-service/runner/requirements.rdagent.lock` SHA-256: `3fe5f6612a1cc9bb6c756086eed6d578744023b5abf32006af85928cd6da1d2f`.
- `uv lock --locked --offline --check` passed, and a repeated `uv export` compared byte-for-byte with the checked-in pip lock.

## Build and smoke evidence

- Build: `docker build --platform linux/amd64 -f services/research-automation-service/runner/Dockerfile -t stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593-full-deps .` exited 0.
- Image ID: `sha256:98fb5215ea3a02e453875c885f47545c0c9b2a97a7b75f3d6bda4438be2d507c` (`linux/amd64`, 2,491,127,262 bytes).
- Smoke: `STOCKQUANT_RUNNER_IMAGE_REF=stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593-full-deps STOCKQUANT_RUNNER_IMAGE_ID=sha256:98fb5215ea3a02e453875c885f47545c0c9b2a97a7b75f3d6bda4438be2d507c pnpm v31:runner-smoke` exited 0.
- Six isolated container scenarios passed: normal import/output copy, Runner timeout, path rejection, 128 MiB OOM, read-only root/input with isolated writable output, and host-timeout daemon-container cleanup.
- Normal execution imported RD-Agent 0.8.0, Qlib 0.9.6.99, LiteLLM 1.83.0, and OpenAI 3.22.1. The smoke also verified model credentials and Docker socket absent and network denied.
- `pnpm verify:stage -- --stage V3.1 --suite code` exited 0: contracts passed, Research Automation lint and 154 unit tests passed, four PostgreSQL integration files / 19 tests passed against the isolated `research_automation_test` database, Platform typecheck and 87 unit tests passed, Artifact owner-scope HTTP smoke passed with `activeServicesTouched=false`, and Web typecheck passed. An initial run inside the restricted sandbox could not access loopback (`EPERM`); rerunning the prescribed suite with loopback permission passed.
- Execution was Linux/AMD64 emulation on macOS ARM64. This is not native Ubuntu evidence, a live RD-Agent research experiment, Provider call, external cost reconciliation, production network-egress enforcement, or human acceptance.

## Remaining gate

V3.1 remains NOT_RUN for real RD-Agent completion. W3 is NO_TRADE and no source is authorized; no model credentials were passed to the container and no Provider call was made. Provider adapter, independently reconciled Provider billing, enforceable network/DNS egress policy, active long-running Host evidence, native Ubuntu verification, and user acceptance remain outstanding. The Docker build logged that `git verify-commit` could not run because GPG is not installed; the Dockerfile currently tolerates that check failure, so repository commit pinning is recorded but commit signature verification is not claimed.
