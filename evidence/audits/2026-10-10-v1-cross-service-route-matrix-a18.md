# V1 Portfolio Risk route/caller HTTP matrix A18

Date: 2026-10-10. Scope: the seven admitted Portfolio Risk HTTP routes exercised against an isolated PostgreSQL-backed service by `services/portfolio-risk-service/scripts/service-auth-http-smoke.mjs`.

The smoke sends 28 requests (7 routes × 4 identities: Platform API, Trade Execution, Historical Replay, and test harness). Disallowed callers receive 403; allowed callers with a forged Bearer receive 401. Before/after counts are compared for `accounts`, `ledger_entries`, `account_positions`, `recorded_fills`, `fill_fee_corrections`, and `resource_reservations`; all remain zero. The smoke then continues its existing authorized workflow checks and isolated database cleanup.

The unit test `enumerates every admitted Portfolio route across all four caller identities and methods` covers route/method policy. Complete V1.1 and V1.3 code suites, including this live HTTP matrix, passed:

- [V1.1 suite log](2026-10-10-v11-portfolio-route-scope-http-matrix-code-suite-a01.log), SHA-256 `029d73be9d6924924b41670f6a4f730f92fc75769407daa5b1429a9089ad63dd`.
- [V1.3 suite log](2026-10-10-v13-portfolio-route-scope-http-matrix-code-suite-a01.log), SHA-256 `80a93e54d20e8e970695bca338e791e8734b1322a35d2fccc8d4194ab9e50146`.

This evidence is limited to rejected identity/method probes and their database side effects. It does not establish authorized business workflows, deployment state, human acceptance, or V1 completion.
