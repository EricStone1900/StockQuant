# V1.4 fee schedule effective-date guard

Date: 2026-10-02 (Asia/Shanghai)

## Official schedule review

- SSE's 2023 revised fee guide lists A-share exchange handling fees at 0.00341% bilateral and says the change took effect 2023-08-28: <https://www.sse.com.cn/lawandrules/sselawsrules2025/charge/c/c_20250610_10781461.shtml>.
- SSE's collected tax/fee table lists the securities regulatory fee at 0.002% bilateral: <https://www.sse.com.cn/services/tradingservice/charge/taxfee/>. Together with the handling fee, the pass-through floor enforced by the model is 54,100 parts per billion (0.00541%). Brokerage commission and minimum remain user-configured.
- Ministry of Finance/State Taxation Administration Announcement 2023 No. 39 halves securities transaction stamp tax effective 2023-08-28: <https://fgk.chinatax.gov.cn/zcfgk/c102416/c5211343/content.html>.
- ChinaClear's 2022 Shanghai-market fee table lists A-share transfer fee at 0.01‰ bilateral: <https://www.chinaclear.cn/zdjs/editor_file/20220701154723234.pdf>.

## Change and validation

The `CN_A_CASH_EQUITY_2023_08_28` schedule now rejects an execution date before its effective date. Both the initial BUY execution and any explicit SELL execution are checked before simulation, so an old schedule cannot silently price a pre-effective trade. The Quant unit test covers a 2023-08-25 execution rejection and accepts the 2023-08-28 boundary. Focused Quant tests passed 15/15 and Quant build exited 0. After the change, the complete `pnpm verify:stage -- --stage V1.4 --suite code` exited 0; this includes the repository baseline, full workspace builds/typechecks and service unit suites, including 13 Qlib Worker Python boundary tests.

No historical pre-2023-08-28 schedule was implemented; the existing 2024 fixture does not exercise that period. The fee schedule still does not represent a broker quote, all historical rule changes, exchange calendars or corporate actions. No market-data request, active-service call, Paper/broker call, or external model call was made. Full V1.4 acceptance remains open.
