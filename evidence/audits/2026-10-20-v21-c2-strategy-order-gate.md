# V2.1 C2 strategy/order consumer gate after DAILY_BAR

Date: 2026-10-20  
Scope: C2-B consumer boundary regression after the fixed DAILY_BAR close scheduler. This does not implement a strategy or order executor.

## Result

`pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke` passed (exit 0) using an isolated PostgreSQL container and real Market Data HTTP process. The test injected the close clock for the frozen `2026-10-16` session, observed exactly one scheduled Fixture task, waited for `COMPLETED`, then read the persisted sampling policies.

After DAILY_BAR completion, `strategyEvaluation` remained disabled with trigger `ON_DAILY_BAR_READY`, gate `OD007_APPROVAL`, and executor `NOT_IMPLEMENTED`. `orderExecution` remained disabled with trigger `C5_EXECUTION_WINDOW`, gate `C5_APPROVAL`, and executor `NOT_IMPLEMENTED`. The API reported `placeOrders: false`. This proves daily completion does not implicitly activate either downstream consumer or create orders in this Fixture scenario.

The same smoke reported `externalRequests: 0`; its isolated PostgreSQL container and network were removed and verified. This is automated boundary evidence only. Strategy evaluation, C5 execution-window configuration/consumer, real daily data and full C2-E Web/CLI same-TestRun acceptance remain incomplete. OD-007 remains open for active strategy terms; no approval or user acceptance is inferred.
