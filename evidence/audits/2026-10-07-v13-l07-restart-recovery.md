# V1.3 L07 buffered Fill recovery across Trade restart

Date: 2026-10-07 (Asia/Shanghai).

The formal Web flow now buffers cumulative Fill sequence 2 (150 shares), replays it ten times, restarts only the isolated Trade Execution container, then submits sequence 1 (100 shares). On recovery, sequence 1 applies once and the durable buffered sequence 2 follows causally as a 50-share incremental Fill. The resulting order remains `PARTIALLY_FILLED`; FakeBroker and Portfolio agree at 150 shares and 8,495.0000 CNY cash, reconciliation is `MATCH`, and the same TestRun is independently checked with CLI `--check-only`.

Focused command `STOCKQUANT_V13_E2E_GREP='V1.3 L07 Web resumes a buffered out-of-order Fill' pnpm test:e2e:v13-isolated` passed 1/1. Full command `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e -- --stage V1.3` passed 21/21. Random Compose project `sq-v13-web-ce7a8732b23fa288059c` was cleaned; the harness verified its containers, PostgreSQL volume, network and project images were removed. External market-source and real-broker calls: 0.

The first full-matrix attempt omitted the L08-only `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true` injection. That run retained its failed attempt-count assertion (`attempts=1`, expected 2) and failed Run; it did not indicate a failure in the new L07 recovery path. The full suite was rerun with the fixed injection, where L08 observed the injected first delivery rejection and durable retry (`attempts=2`, `DELIVERED`, `MATCH`). Both records remain available in Playwright/evidence outputs.

The successful L07 browser TestRun is `322d8249-4f10-47e4-9e2e-ec2e3231efaa`; its stage export correctly remains `WAITING` with `manualConclusion=NOT_RUN`. The actual business assertions are from the browser and same-run CLI checks. Its evidence JSON SHA-256 is `9cdcf0bbf230e5035e26298d9f112ff40f53fca1479865a5825639102cecd439`.

`pnpm --filter @stockquant/web typecheck` passed. Source snapshot hashes are recorded in the adjacent manifest. This closes the specific L07 case where an out-of-order buffered Fill survives Trade process restart; it does not close P3's other race/failure boundaries, complete market-rule coverage, runbook handoff, or current human acceptance.
