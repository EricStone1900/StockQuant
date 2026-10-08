# V1.3 SCRAM integration regression

Date: 2026-10-07 (Asia/Shanghai)

The first full `pnpm test:e2e -- --stage V1.3` run used the new per-project SCRAM database credentials and random service Bearer tokens. Nineteen browser tests passed, including the AUTO Mandate, process restart, and causal-fill cases. The dedicated L08 test for a failed Fee Correction Outbox delivery expected two attempts, but saw one because its explicit isolated fault-injection flag was not enabled. This is an invocation-configuration failure; it does not establish a SCRAM or service-auth defect. The random Compose project and its database/artifact resources were removed by the harness. The complete first-attempt output is retained in [the failure log](./2026-10-07-v13-scram-e2e-missing-fault-flag.log).

The intended matrix command must set `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true`; that flag is confined to the isolated Compose environment and exercises the planned first-delivery failure and retry. The corrected run passed 20/20 browser tests under SCRAM and random service tokens (`sq-v13-web-b6b4c047cec7d2bd897d`). Reviewing its cleanup exposed project-owned Web/Trade/Governance images left behind by the harness; those exact images were removed and the harness was corrected to remove and verify all project-tagged images.

The final run used the same command after the cleanup fix and passed 20/20 in 1.1 minutes. Project `sq-v13-web-af5ff20faa2d6ca4c386` reported PASS, with zero external source and real-broker calls. Independent Docker queries confirmed zero matching containers, volumes, networks, and images. All 20 browser scenarios exported structured evidence; the L08 retry TestRun is `ea0ea3b7-f357-4f4e-91ea-8d45e4fad215`. Its `manualConclusion` remains `NOT_RUN`. The successful output is retained in [the final run log](./2026-10-07-v13-scram-e2e-final.log).

Validation command:

```bash
STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e -- --stage V1.3
```

This closes the current fixed V1.3 browser matrix regression under the hardened database/service credentials. It does not complete V1.3's remaining open boundaries, manual acceptance, or the overall V1 plan.
