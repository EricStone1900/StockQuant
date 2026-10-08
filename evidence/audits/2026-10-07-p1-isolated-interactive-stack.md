# P1 isolated interactive stack lifecycle

Date: 2026-10-07  
Scope: V1.1 only. Other stage stacks are explicitly rejected by `stack:up` until their own isolated Compose/service requirements are configured.

## Implementation and verification

Replaced the previous `stack:up` behavior that read `.env.local` and targeted the fixed main Compose project. V1.1 now uses a random `sq-v11-stack-<20 hex>` project and `docker-compose.v11-integration.yml`, random loopback ports for Platform and containerized Web, a random PostgreSQL superuser password and per-role passwords, and password-bearing service URLs under SCRAM host authentication. The private ignored env file and state are mode 0600 in a mode-0700 directory. PAPER/FAKE/LIVE-disabled settings remain explicit, and Web runs through an isolated Compose profile. `stack:down` requires the exact registered project name, rejects missing/unknown IDs before Docker Compose, then verifies that this project's containers, volume and network are removed before deleting its credentials/state. Built images are retained as the local Docker build cache.

Two preliminary interactive startups (`sq-v11-stack-3ee6d45ae35d7a951052` and `sq-v11-stack-c6e49222f90f5db6efae`) passed service health but preceded discovery of PostgreSQL `trust` authentication in the V1.1 integration Compose. Both exact projects were purged before the SCRAM change; neither is used as final authenticated-stack evidence. The bare `pnpm stack:down` check exited 2 before any Docker operation. Exact cleanup of the first project exited 0 and verified removal of its containers, PostgreSQL volume, network, env file, and state file; no default/active Compose target was used.

The first run of the isolated stage harness after adding the interactive Web profile exited 1 because the new `V11_WEB_HOST_PORT` interpolation was missing in the test harness. Compose started no project containers. After passing a separate random Web port and switching PostgreSQL from trust to SCRAM, the full `pnpm test:integration:v11-stage-storage` command exited 0: code suite passed, Chromium normal/rejection/recovery 3/3, all three Run IDs were checked by same-ID CLI, and recovery restarted only the verified Portfolio container. Run IDs: `c7febd0d-f6a2-4f87-af2b-b55dccb1fb9a`, `84375f85-5edb-4d45-b1ed-389b74ab0699`, `e2df2250-6d2d-4e03-a519-e36fb7362eb8`. Harness confirmed exact project `sq-v11-stage-1c0a5531fd326f3a8793` containers/volume/network/image removal.

A SCRAM-authenticated interactive project `sq-v11-stack-1d4ebf6e98b0661a4031` was stopped successfully with the exact-ID command; cleanup verified its containers, volume, network, and credentials removal. A fresh SCRAM stack remains running for review: project `sq-v11-stack-6c7c96c2fd4cde3f6e88`, Web `http://127.0.0.1:59783/acceptance/v1/v1.1`, API `http://127.0.0.1:59782`. Startup reported both endpoints healthy. Generated env/state files are mode 0600 in their mode-0700 directory. Stop with `pnpm stack:down -- --project sq-v11-stack-6c7c96c2fd4cde3f6e88`. The isolated database has no scenario TestRuns yet. No live broker, real market source, active database, or `.env.local` credentials were used.

## Boundary

This implements the isolated interactive lifecycle for V1.1 only. It does not complete the five-stage V1 interactive environment, Ubuntu delivery, all runbook walkthroughs, V1.1 active legacy/stage cutover, new-scope human acceptance, or P1 overall.
