# V1.2 market-session E2E initial failure

Date: 2026-10-10. Scope: the first isolated full V1.2 E2E after switching the research fixture to `v1.2-market-data-5`.

The isolated Compose stack built and started, then Playwright failed at `apps/web/tests/e2e/v11-acceptance.spec.ts:267`: the UI correctly returned `v1.2-market-data-5`, while the assertion still expected `v1.2-market-data-4`. No business-run assertion was accepted from this attempt. The harness removed the exact random project's containers, volumes and network.

Correction: updated the expected current fixture version to v5. The subsequent independent Web/API/CLI E2E passed with four new TestRuns and verified cleanup; see [successful run](./2026-10-10-v12-market-session-calendar-web-e2e-a01.log) and [complete V1.2 suite](./2026-10-10-v12-market-session-calendar-code-suite-a02.log).
