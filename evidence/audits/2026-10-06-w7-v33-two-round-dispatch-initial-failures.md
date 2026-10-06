# W7 V3.3 dispatch slice: initial verification failures

Date: 2026-10-06

These failures were retained as diagnostics; they are not the final verification result.

1. The first full V3.3 code-suite invocation in the default sandbox stopped during Research Automation unit tests: five local proxy tests could not bind `127.0.0.1` (`listen EPERM`). No test server or external call was made by those failed cases. The full suite was rerun with controlled local loopback access.
2. The first controlled full-suite run exposed two Web assertions expecting the previous static labels `PERSISTED_WAITING_ONLY` and `NOT_IMPLEMENTED`. The UI now reports `PERSISTED_WAITING_WITH_SCENARIO_PROGRESS` and `PARTIAL_TWO_ROUND_FIXTURE_DISPATCH`, matching the new partial implementation. Assertions were corrected and the complete suite was rerun successfully.

The successful final command and scope are recorded in [the dispatch audit](./2026-10-06-w7-v33-two-round-dispatch.md) and [full-suite log](./2026-10-06-w7-v33-two-round-dispatch-code-suite.log).
