# P1 Artifact inventory recheck after V1.3 Fixture work

Date: 2026-10-08 (Asia/Shanghai)
Result: `NOT_CLOSED`; no newly found V1.3 dynamic Artifact producer.

## Inventory result

- The new `v1.3-trading-loop` input is a checked-in, frozen synthetic Fixture with its own versioned manifest and scenario SHA-256. It is an immutable input contract, not a runtime Artifact producer and not part of `research-artifacts-v1`.
- V1.3 TestRun state, proposals, mandates, FakeBroker orders/fills/assets, Portfolio reservations and ledgers remain service-owned relational facts. Web refresh reads these facts through their owner APIs; it does not publish a binary order Artifact.
- V1.3 browser screenshots and Playwright traces are retained under `evidence/audits/` with a separate SHA-256 list. Per-Run evidence exports remain explicit local export bundles and do not grant Platform ownership of Research or Quant bytes.
- The existing dynamic byte producers remain Research Automation Runner and Platform Qlib Fixture (Research Automation / Platform metadata owners), plus the Quant backtest report owner already listed in the P1 inventory. Market Data collection rows remain structured, project-scoped relational data. No code changed in this V1.3 slice that creates another shared content-store producer.

## P1 decision and cutover gates

`OD-013` is still `OPEN`: the owner has not selected generated-artifact retention duration, protected evidence classes, orphan/quarantine eligibility or physical deletion authority. Therefore there is still no default generated-artifact expiry, scheduler or physical cleanup. The [active storage cutover preparation](2026-10-07-p1-storage-cutover-preparation.md) remains `DRAFT_NOT_EXECUTABLE`; there is no approved paired backup/restore exercise, maintenance window, named operator/rollback owner or disposition for active nonterminal runs. No active data, volume or writer state was changed.

The latest [V1 version gate](2026-10-08-v1-final-gate.log) is `INCOMPLETE` / exit 2. It reports stage-document audit 5/5 and evidence audit 318 references, 14 manifests, 71 entries, zero path/hash failures; four historical structured exports remain missing: V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`, V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`, `48e32a09-4901-424f-8585-7b01ab9f83f7`, and `113fea95-5fee-42ee-b702-f8423b8a173c`. Fresh V1.3 runs do not replace those records.

This recheck closes only the question of whether the new V1.3 Fixture/order-display change added a P1 Artifact producer. P1 remains `NOT_CLOSED` until OD-013 and active-cutover gates are resolved with the owner and actual operators.
