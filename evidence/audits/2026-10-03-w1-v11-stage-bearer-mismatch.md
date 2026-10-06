# W1 V1.1 stage-mode Bearer alignment and end-to-end rerun

Date: 2026-10-03 (Asia/Shanghai)

## Finding and correction

The first current-worktree `pnpm test:integration:v11-stage-storage` run failed its three browser scenarios. A direct owner-scoped API probe against the exact same disposable Compose topology showed the cause: TestRuns failed before assertions with `Portfolio Risk returned HTTP 401`. The isolated Portfolio service trusted `v14-isolated-platform-token`, while the V1.1 Platform API sent `v11-isolated-platform-token`. The V1.1 Compose trust value was corrected to match its V1.1 Platform caller. Existing random database-role password injection and cleanup behavior were preserved.

The standalone `pnpm test:e2e -- --stage V1.1` command also failed because the recovery E2E requires the isolated stage harness to set `STOCKQUANT_ISOLATED_V11_PROJECT`; it is not a valid standalone V1.1 recovery command. That failure is retained as diagnostic history. The documented `pnpm test:integration:v11-stage-storage` harness is the verified entry point.

## Verification

`pnpm test:integration:v11-stage-storage` exited 0 after the correction. Its complete isolated `V1.1` code suite passed, followed by Chromium normal, rejection and recovery: 3/3. Web and CLI read the same run IDs:

- normal: `7900770e-fa92-4eee-8308-4ded349b82dd`
- rejection: `fd362ede-57c1-409a-bf69-564e5c2dd281`
- recovery: `8de524fc-7781-42e3-8f8b-7507d53ac636`

The recovery command was verified to target the isolated Portfolio container. The harness removed its exact randomly named containers, PostgreSQL volume, network and application image tags and confirmed no such project resources remained. No market-data source, Provider, Broker, active Paper account or shared database was called by this test.

The earlier sandbox run of the complete code suite stopped at the Qlib Worker test's loopback bind with `EPERM`; the controlled full suite inside the isolation harness passed. No V1.1 active API cutover, migration, historical nonterminal TestRun cleanup or new user acceptance was performed. V1.1 remains partially implemented.

