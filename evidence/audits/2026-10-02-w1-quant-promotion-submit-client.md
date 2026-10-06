# W1 Research Automation to Quant Promotion submit client audit

Date: 2026-10-02 (Asia/Shanghai)

## Change

The `POST /v1/promotions` caller now uses the generated `GeneratedQuantPromotionSubmitClient` from `quant-promotions.v1` rather than assembling an HTTP request in the Research application service. The generator checks operation ID, ServiceBearer, required `research-automation-service` identity, request and result schemas, and both documented success statuses. `contracts:generate` and `contracts:check` include this generated file.

The client enforces HTTP(S) URL and Bearer validation, fixed route/method/identity, redirect refusal, bounded timeout, response size and schema checks. The application maps transport failures, non-success statuses, invalid responses and request-binding mismatch to UNKNOWN; the persistent journal requires exact-key reconciliation and prevents blind resubmission.

## Verification

- `pnpm contracts:check`: PASS (146 schemas, compatibility and OpenAPI checks; 1 new submit operation included).
- Research Automation lint: PASS.
- Research Automation unit suite: 32 files / 182 tests PASS.
- `pnpm verify:stage -- --stage V3.2 --suite code`: exit 0. The suite included Platform integration (4 files / 5 tests), disposable PostgreSQL and internal-network V3.2 readiness smoke, Web build/typecheck/test, and version-gate consistency checks.
- Readiness smoke TestRun: `c3c7a0cd-7df1-43b6-8580-4aa8c778b80b`; status `WAITING`, source `READINESS_ONLY`, business validation `NOT_RUN`, Registry mutation not performed, Paper calls 0, `activeServicesTouched=false`.
- No external market data or model Provider calls.

## Boundary

This verifies code and isolated readiness only. It does not run an accepted real V3.2 candidate/independent validation, record human approval, mutate the active Registry, or close V3.2/W1.
