# V1.4 durable report ArtifactRef slice

Date: 2026-10-07 (Asia/Shanghai)

Status: PASS for the V1.4 Quant-owned backtest report reference and read path. P1's cross-V1 Artifact requirement remains open.

Quant continues to own the immutable BacktestRun and Manifest rows. After both are persisted, its result contract returns their exact SHA-256 values. Platform binds the report hash to the owner/TestRun in the shared `artifact-ref.v1`, exposes it on the persistent TestRun, and serves the report through an owner-scoped endpoint. Before export, Platform recomputes the canonical result hash and rejects mismatches. Incomplete, failed, or cancelled runs publish no report reference. No shared physical store or automatic expiry/deletion policy was added.

Validation:

- Platform report-reference and persistent-run tests plus adapter tests: 11 passed; Platform and Quant Research builds passed.
- `pnpm contracts:check`: PASS; generated TS/Python contract drift, compatibility, and OpenAPI checks passed. The compatibility matrix includes 111 consumer rules, including the Quant Research → Platform V1.4 result contract. The Platform V1.4 OpenAPI contract is registered in `scripts/check-openapi-contract.mjs`.
- `pnpm verify:stage -- --stage V1.4 --suite code`: PASS (exit 0), including the full Platform unit suite and required cross-repository checks.
- `pnpm test:integration:v14-backtest`: PASS with isolated SCRAM PostgreSQL, Quant, Platform, Vite Web and CLI. Playwright 5/5; API-created and all seven Web-created Runs passed same-Run CLI checks. Report endpoint content/hash verified; `credentials: omit` foreign-owner request returned 403. Recovery from Platform termination before Quant and after Quant persistence completed with stable IDs. Cancellation before Quant created no report. Isolated containers, volume and network were removed.
- `pnpm docs:check`: 4898 links checked with no failures. Source/evidence SHA-256s are in the linked manifest.

Isolated project: `sq-v14-backtest-40fb36100b381d1dafdf`. Primary normal TestRun: `2e13fd9a-0d4b-4044-ad25-c23b5cf4350f`, report SHA-256: `cdaf9a1f1ea994087d827af89f98981cb4152a618a093f8c9a517faf4c63f9e0`. Machine run evidence: [V1.4 isolated integration](./2026-10-07-v14-durable-tasks-40fb36100b381d1dafdf.json). Source and evidence hashes: [SHA-256 manifest](./2026-10-07-p1-v14-report-artifact-ref.sha256).

This closes the V1.4 report ArtifactRef slice only. The P1 cross-V1 identity/access/export audit still needs the V1.1 and V1.3 artifact-bearing evidence and the V1 data ingestion/export path. Current human acceptance remains NOT_RUN; V1.4 and V1 remain PARTIALLY_IMPLEMENTED/INCOMPLETE.
