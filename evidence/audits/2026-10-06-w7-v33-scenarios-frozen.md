# W7 V3.3 isolated scenario input freeze

Date: 2026-10-06 (Asia/Shanghai)

## Result

The deterministic V3.3 `normal`, `rejection`, and `recovery` scenario inputs are frozen as `v3.3-research-orchestration-1`. The scenario document is validated by `fixtures/manifests/v3.3-research-orchestration-scenarios.schema.json`; its SHA-256 is pinned in the Fixture Manifest. Expected budget values use integer USD cents, and the recovery fault order is exact.

The fixture specifies a two-round normal case (23 + 23 cents settled, 34 cents reservation released), two round-result artifacts plus one workflow summary, a TestRun cap rejection (55 cents projected against a 50-cent cap, with no new Experiment/Job/ledger mutation), and recovery after checkpoint 1 with lease takeover from fence 1 to 2 and stale-fence publish rejection. The rejection scenario records the tested operation as `REJECTED` while the acceptance assertion and TestRun pass; an expected refusal is not a failed scenario. All external call counts are fixed at zero; input contains no market data, provider response, credential, or source authorization.

## Verification

- `pnpm contracts:generate`: exit 0; generated the new scenario type from the schema.
- `pnpm baseline:check`: exit 0; Markdown links 3,995/3,995; 234 JSON files, 162 schemas and 41 fixtures validated; all service layer checks passed; governance tests 30/30.
- `pnpm fixtures:check`: exit 0; fixture hashes verified and the existing V3.2 deterministic fixture recomputed.
- `git diff --check`: exit 0.

## Limits

This freezes inputs and expected assertions only. It does not execute or implement the V3.3 business workflow. The current Web and CLI scenario paths remain readiness-only (`WAITING` / `NOT_RUN`); no Runner Job was dispatched, no provider or data source was called, no Paper or broker path was accessed, and no stage or human acceptance was marked complete. W7 stays open.

See [`2026-10-06-w7-v33-scenarios-frozen.sha256`](./2026-10-06-w7-v33-scenarios-frozen.sha256) for the content manifest.
