# V1.5 current-worktree code-suite rerun

Date: 2026-10-07 (Asia/Shanghai)

Command: `pnpm verify:stage -- --stage V1.5 --suite code` from the repository root.

The ordinary sandbox attempt exited 1 when the Qlib Worker boundary test tried to bind a random loopback socket and received `EPERM`. That failure is retained. The same command then ran in the controlled local environment and exited 0.

The completed suite reported Markdown links 4,925/0 failures, JSON/schema/Fixture validation 287/203/45 with 0 failures, registered contract generation and drift checks, service-layer checks for the enabled services, builds/typechecks and the workspace unit suites. Reported suites included Governance 40, Historical Replay Worker 25, Market Data 74, Trade Execution 86, Quant Research TypeScript 97 and Python Worker 14, Platform API 227, and Research Automation 218 passing tests. The V1.5 orchestration unit test independently passed 3/3. The code suite verifies that unconnected V1.5 business workflows remain WAITING/NOT_RUN; this run does not claim Temporal business workflow execution, order/ledger facts, backup recovery, human acceptance, Ubuntu compatibility, or a V1 version PASS.

The repository HEAD at validation was `c0f6745fa4a8615bfc4913431e73ce3b8b01fab8`. The SHA-256 of the tracked worktree diff at audit capture is recorded in the adjacent file. The diff hash identifies the dirty-worktree patch state and is not a committed release hash.
