# V3.3 Web capability boundary correction and current-source regression (2026-10-06)

The acceptance page still labeled its workflow `PARTIAL_TWO_ROUND_FIXTURE_DISPATCH` and said container execution, settlement, and recovery fault injection were pending. That contradicted the completed isolated V3.3 workflow. The page now reports the verified Fixture scope: two-round execution and settlement, same-TestRun normal/recovery/rejection assertions, and the zero-side-effect budget rejection. It continues to report Paper parallel availability as `NOT_CHECKED` and states that Fixture evidence does not establish real Provider, market-data, Paper, Ubuntu, or stage acceptance.

The Playwright boundary assertion was updated with the page. `pnpm --filter @stockquant/web typecheck` passed. The first local E2E attempt failed because the restricted sandbox denied `127.0.0.1:5173` (`listen EPERM`); this attempt was retained. The same isolated, mocked-API browser suite was then run in the controlled local test context and passed 5/5. The full command `pnpm verify:stage -- --stage V3.3 --suite code` subsequently exited 0 against the updated Web source and test: baseline/contracts passed, Research Automation 218 unit tests and 32 PostgreSQL integration tests passed, Platform 200 unit and 8 PostgreSQL integration tests passed, Runner Host checkpoint takeover/fencing smoke passed, the cross-service dual-PostgreSQL and no-network Runner workflow passed, and Playwright passed 5/5.

That suite produced and independently exported these latest business TestRuns:

- normal `98054476-9b1c-4896-82f9-23de4e548505`, manifest SHA-256 `37bb842c9b6bbcf51020ab4d3385f9b76806fbd81479e6da60edd1763f9d4c53`;
- recovery `df7779d0-3cc3-4bd6-b4af-a17b57d0b37d`, manifest SHA-256 `6a43fc107de570181bfa42f3bb47f0be0815b859b1e9ffec26bd07a1632225e`;
- rejection `d44eb74f-0bb5-46d1-a7c9-1a851c4ef236`, manifest SHA-256 `6f75fc9577b001af56080cf47dff7bc982cac7175994b05f55b0a244e6282e58`.

The normal and recovery runs verified two rounds, independently checked output bytes/Fixture metrics, and settled exactly 46 of 80 reserved cents. Recovery verified SIGKILL, lease takeover at fence 2, checkpoint resume, and stale publication HTTP 409. Rejection verified the 80-cent experiment request failed under the 50-cent TestRun cap with HTTP 422 and zero Experiment/allocation/model-call/Runner-job side effects. External Provider calls were 0 and the smoke reported active services `NOT_CONNECTED`, followed by isolated resource cleanup.

The browser test uses mocked API routes and verifies page behavior; it is not browser-to-live-service evidence. Paper continuity remains `NOT_CHECKED`; human acceptance remains `NOT_RUN`; V3.3 and V3 remain `NOT_RUN`/`INCOMPLETE`. This correction does not close those gates. Machine evidence and exact current source/TestRun hashes are in the adjacent JSON and SHA-256 manifest.
