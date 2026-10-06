# W7 V3.3 settled Fixture call replay recovery

Date: 2026-10-06

## Change

The Platform dispatch workflow can retry after Research Automation durably settles a deterministic Fixture model call but before Platform checkpoints that round. Previously the gateway returned `ALREADY_EXISTS` for every duplicate modelRunId, leaving this narrow lost-acknowledgement window unresolved. The explicit Fixture endpoint now reconstructs the fixed response only when the coordinator has matched the original fingerprint and the ledger confirms the exact request, budget, round, and `SETTLED` status. It returns the recorded settlement and makes no second model call. `DISPATCHED`, `UNKNOWN`, and other non-settled duplicates still fail closed.

The same real-route review found the HTTP handler exposed `settledCostCents`, while the versioned contract and Platform client require `actualCostCents`. The handler now maps the coordinator's internal field to the contract field for both first completion and settled replay. The fixed pipeline and budget summary HTTP consumers were updated to assert the contract rather than the internal coordinator name.

## Verification

- `pnpm --filter @stockquant/research-automation-service lint`: PASS.
- `pnpm --filter @stockquant/research-automation-service build`: PASS.
- `pnpm --filter @stockquant/research-automation-service exec vitest run tests/unit/v31-model-gateway.spec.ts`: 7/7 PASS.
- `pnpm --filter @stockquant/research-automation-service model-gateway:fixture-http-smoke`: PASS; verifies same-request replay returns the exact fixed response and 23-cent settlement; UNKNOWN still does not retry; external calls 0.
- `pnpm --filter @stockquant/research-automation-service v31:fixed-pipeline-http-smoke`: PASS; real HTTP flow consumes `actualCostCents`, executes the offline Runner Fixture, validates output metrics/hash, and settles the isolated Experiment.
- `pnpm verify:stage -- --stage V3.3 --suite code`: exit 0 after the contract-field fix. Research Automation 217 unit/30 PostgreSQL integration; Platform 192 unit/8 integration; Web E2E 3/3; isolated two-round Runner recovery and pagination-capacity probes PASS.
- The HTTP smoke uses isolated local test resources. The full code suite uses deterministic fixtures only: no external Provider, market data, Paper, or Broker calls, and no active business ledger writes.

## Acceptance boundary

This closes the settled-call/lost-Platform-checkpoint retry window for the deterministic Fixture path. It does not implement Runner job polling, output reconciliation, final workflow assertions/export, rejection/recovery scenario orchestration, measured Paper coexistence, Ubuntu acceptance, or human sign-off. V3.3 remains `NOT_RUN`; formal V3 acceptance remains incomplete.

See the durable [full V3.3 code suite log](2026-10-06-w7-v33-fixture-replay-contract-code-suite.log), [model gateway HTTP smoke](2026-10-06-w7-v33-fixture-replay-http-smoke.log), [fixed pipeline HTTP smoke](2026-10-06-w7-v33-fixture-replay-fixed-pipeline-smoke.log), and [SHA-256 manifest](2026-10-06-w7-v33-fixture-replay-recovery.sha256).
