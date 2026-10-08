# P1 V1.3 isolated interactive stack and E2E regression

Date: 2026-10-07 (Asia/Shanghai)

This audit covers the V1.3 isolated interactive stack lifecycle and a separate full fixed browser matrix. It does not sign user acceptance.

`pnpm stack:up -- --stage V1.3` started Compose project `sq-v13-web-773629b8e36c2a5e16f3`. The Web acceptance page was `http://127.0.0.1:50251/acceptance/v1/v1.3` (HTTP 200); Platform `http://127.0.0.1:47290/live` returned live and Trade `http://127.0.0.1:23919/ready` returned ready with `brokerMode=FAKE`. PostgreSQL reported `password_encryption=scram-sha-256`. Harness-generated DB role passwords and service tokens were stored in ignored `.codex/isolated-stacks/` files with mode 0600.

`pnpm stack:down -- --project sq-v13-web-773629b8e36c2a5e16f3` requested graceful cleanup through the exact project's private stop marker. The harness reported `MANUAL_STACK_CLEANUP_VERIFIED`; containers, volumes, networks, project-tagged images, and private state/credential files were zero afterward. Human acceptance was `NOT_RECORDED`.

The separate full browser matrix was run as `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e -- --stage V1.3`. All 20 tests passed in 1.1 minutes for isolated project `sq-v13-web-af5ff20faa2d6ca4c386`; the harness reported zero external source and real-broker calls. Independent Docker queries confirmed zero matching containers, volumes, networks, and images. All generated Run evidence keeps `manualConclusion=NOT_RUN`; the L08 retry Run was `ea0ea3b7-f357-4f4e-91ea-8d45e4fad215`. The first invocation without the explicit fault flag failed 19/20 and is retained with the corrected reruns in [the matrix audit](./2026-10-07-v13-scram-e2e-retry.md), including its full logs.

Validation: `node --check` passed for all three changed Node entrypoints; `git diff --check` passed; `pnpm docs:check` checked 4,888 local Markdown links with zero failures. The V1.3 code suite initially encountered a sandbox `EPERM` binding Qlib Worker's random loopback port; rerunning the same suite with loopback permission completed successfully. Contracts, fixtures, service-layer checks, build, typecheck, unit tests and Qlib Worker tests passed. V1 version gate remains INCOMPLETE; this audit is not stage acceptance or version release approval.
