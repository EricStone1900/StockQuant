# V3.3 current-worktree code suite

Date: 2026-09-30. `pnpm verify:stage -- --stage V3.3 --suite code` exited 0. Contract/Fixture checks, Research Automation 169 unit tests and 20 isolated PostgreSQL integration tests, HTTP smokes, Platform 94 unit and 3 integration tests, Web typecheck, and Chromium 3/3 passed.

The suite explicitly reports `businessWorkflow=NOT_IMPLEMENTED`, `stageBudgetControl=NOT_IMPLEMENTED`, `paperContinuity=NOT_CHECKED`, business validation and human acceptance as `NOT_RUN`. It dispatched no research jobs, made no external model calls, and created no orders. An initial sandboxed invocation could not bind 127.0.0.1 (`EPERM`); the same suite passed when rerun with controlled local loopback permission.
