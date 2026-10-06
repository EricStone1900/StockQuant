# W9 three-version gate refresh after V1.3 evidence audit

Date: 2026-10-06. The version verifiers ran after V1.3's implementation claims were audited and corrected. Current outcomes: V1, V2 and V3 all `INCOMPLETE`; stage documentation audits and evidence-reference/manifest audits all `PASS`. Unresolved stage counts are V1=5, V2=5, V3=4; unresolved Acceptance rows are V1=5, V2=5, V3=4. No version or human acceptance status was promoted.

The V1.3 Section 2 implementation checklist is now truthful: its five claims are unchecked because the real V1.3 route has not connected Governance, Trade Execution, Portfolio or FakeBroker. Historical human sign-off remains preserved. The initial browser surface audit is [here](./2026-10-06-w1-v13-synthetic-web-e2e.md). In subsequent work, the engine was corrected to return WAITING/NOT_RUN instead of emitting synthetic pass evidence; that boundary, the rerun full code suite and the updated isolated E2E are documented [here](./2026-10-06-w1-v13-waiting-boundary.md).

The first verifier attempt correctly exposed active manifests containing older hashes of the shared delivery plan. Those files were immutable execution-time snapshots, so their links were explicitly labeled as historical execution snapshots; the original manifests and output were retained. Re-run then reported the evidence subaudit clean. This did not modify the original audit manifests.

The final version-gate reports were refreshed again after V1.3's WAITING boundary correction. Results remained V1/V2/V3 `INCOMPLETE`, unresolved stages 5/5/4, with stage-document and evidence audits passing and zero evidence hash failures.

Machine summary: [JSON](./2026-10-06-w9-after-v13-synthetic-audit-summary.json). Per-version reports: [V1](./2026-10-06-w9-after-v13-synthetic-audit-v1-gate.json), [V2](./2026-10-06-w9-after-v13-synthetic-audit-v2-gate.json), [V3](./2026-10-06-w9-after-v13-synthetic-audit-v3-gate.json). Initial historical-manifest diagnostic is preserved at [first run](./2026-10-06-w9-after-v13-synthetic-audit-manifest-diagnostic.log). Input/output SHA-256s are in [manifest](./2026-10-06-w9-after-v13-synthetic-audit.sha256).
