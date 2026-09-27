# V3.2 frozen independent-recomputation input

Date: 2026-09-27 (Asia/Shanghai)

## Deliverable

Added immutable fixture version `v3.2-independent-validation-1` under `fixtures/v3/v3.2-independent-validation-v1/`. It contains two explicitly synthetic CN securities with 180 weekday sessions each, timestamped daily OHLCV bars, a fixed 5/20 SMA-cross candidate description, and a validation design with disjoint 108/36/36 session splits. PIT timing, next-session-open execution, 5 bps commission and slippage per side, absolute return tolerance, allowed algorithm/windows, and 1% volume participation limit are fixed in the design. The manifest marks source `SYNTHETIC`, `FIXTURE`, and `RESEARCH_ONLY`; holidays, corporate actions, delistings, and profitability are explicitly outside its claims.

The generator `scripts/v32-independent-fixture.mjs` creates the version only when it does not already exist and has a `--check` mode that reconstructs every byte including the manifest. The check also parses all 360 rows and validates per-security count, unique chronological weekdays, exact `availableAt`, OHLCV invariants, disjoint session windows and fixed SMA parameters. `pnpm fixtures:check` now runs both generic Manifest SHA verification and this deterministic-source/semantic comparison.

## Verification

- `node scripts/v32-independent-fixture.mjs --check` — PASS; 2 securities × 180 sessions, all generated file hashes reported.
- `pnpm fixtures:check` — PASS; 18 manifest file references, zero hash failures, deterministic fixture comparison PASS.
- Semantic fixture checks — PASS; 360 bars across two securities, 180 sessions each, all frozen invariants pass.
- `pnpm verify:stage -- --stage V3.2 --suite code` — exit 0. Baseline checked 91 JSON files/46 schemas/34 contract fixtures/33 compatibility rules, 15 global Fixture files and this deterministic fixture; Quant 26 TypeScript + 3 Worker tests and isolated PG/HTTP smokes; Research Automation build/135 tests and isolated PG/HTTP preparation-journal smoke; Web typecheck/test. Suite result explicitly remains code `PASS`, business validation `NOT_RUN`, Registry mutation `NOT_PERFORMED`, human acceptance `NOT_RUN`.

## Boundary

This closes the absence of usable frozen input files, not the independent validator. No candidate code was executed, no Qlib run or PIT/OOS/cost/capacity result was produced, and no V3.2 TestRun, human approval, or Registry mutation occurred. This synthetic dataset cannot establish trading profitability, real market quality, or production capacity. Business validation and human acceptance remain `NOT_RUN`; Registry mutation remains `NOT_PERFORMED`.
