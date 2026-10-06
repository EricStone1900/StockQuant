# W3 Market Data public-source HTTP adapter boundary

Date: 2026-10-02 (Asia/Shanghai)

## Change

Moved the V2.1 Tencent quote preview, source smoke and public news page HTTP transport from the Market Data bootstrap into `PublicSourceHttpAdapter`. The existing route-level per-use authorization checks remain before adapter invocation. The adapter accepts an injected `fetch` and Clock, applies bounded 5-second timeouts, preserves source timestamps and returns deterministic stale/error results without throwing through the route. The Market Data layer guard now rejects outbound `fetch()` calls in bootstrap.

## Verification

- Market Data lint/typecheck: PASS; unit suite: 17 files / 70 tests PASS, including 3 new injected-transport cases.
- `pnpm verify:stage -- --stage V2.1 --suite code`: exit 0 with the isolated Market Data/PostgreSQL 23-test integration suite and Platform project-delivery HTTP smoke. The smoke explicitly reports no external source requests.
- Full baseline after the layer guard change: PASS; 2088 Markdown links, 211 JSON / 146 schemas / 36 Fixtures, 24 generated client registrations and 21 architecture/version-gate tests.
- Initial sandbox stage-suite attempt hit loopback `EPERM` in an existing Quant Worker unit test; the controlled local rerun passed. No live Provider was called and active services were untouched.

## Boundary

This is an adapter-boundary improvement only. No data source was probed; source authorization and data-version evidence remain absent under the user's NO_TRADE decision. V2.1 real quote/news requirements and business/human acceptance remain incomplete.
