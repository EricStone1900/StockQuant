# V1.2 interactive stack shutdown protocol A01

Date: 2026-10-12. This verifies the current V1.2 manual stack startup and its exact-project shutdown procedure after updating the printed instructions.

`pnpm v12:acceptance` reached `READY_FOR_MANUAL_ACCEPTANCE` for project `sq-v12-e2e-63523f9c7a5cbf8945bf`, Web `http://127.0.0.1:50662/acceptance/v1/v1.2`, Platform API `http://127.0.0.1:23161`, Fixture `v1.2-market-data-1`, with source authorization `NONE`, FakeBroker and LIVE disabled. The built-in identity boundary rejected 11 anonymous and 11 forged-owner route requests. Six client-mode injections returned 422 without creating a TestRun.

From a second terminal, `pnpm stack:down -- --project sq-v12-e2e-63523f9c7a5cbf8945bf` exited 0 and reported `STOPPED_AND_PURGED`. The startup process then exited 0 with `MANUAL_STACK_CLEANUP_VERIFIED`; containers, volumes, networks and project images were all zero, and the temporary credentials file was removed. The exact outputs are summarized in [the machine record](./2026-10-12-v12-interactive-stack-down-protocol-a01.json).

No user scenario or human acceptance was performed. `humanAcceptance` remains `NOT_RUN`; this record proves only interactive fixture startup and exact cleanup. Input/source hashes are in the adjacent SHA-256 manifest.
