# P1 V1.1 persistent account and Web baseline rerun

Date: 2026-10-07 (Asia/Shanghai).

`pnpm test:e2e -- --stage V1.1` exited 0 on the current working tree. The command ran the required repository code suite and the isolated V1.1 browser/API/CLI matrix: normal, rejection and recovery all passed (3/3). Each browser-created TestRun was checked through the CLI with `--check-only` using the same ID:

| Scenario | TestRun ID | Result |
|---|---|---|
| normal | `5f13cb68-c0bb-4bb7-be88-201fbd57c605` | PASS |
| rejection | `3f81908f-c411-4c95-8ccb-f9c2720319e4` | PASS |
| recovery | `4aae0255-a49c-4bc3-b3e9-857599a02503` | PASS |

The recovery case restarted only the Portfolio container whose identity the isolated harness verified. The random project was `sq-v11-stage-c0372e85fd9fc67f7cfd`; cleanup removed its containers, PostgreSQL volume, network and images. The full command output, including cleanup evidence, is [the raw log](./2026-10-07-p1-v11-account-web-e2e.log).

Code-suite counts included Platform API 59 files/261 tests, Portfolio Risk 3 files/5 tests and the locked Python research worker 14/14 tests. This proves the V1.1 baseline slice only. It does not by itself complete P1's broader dual-market/original-currency/independent-ledger, idempotency-conflict, owner/run and LIVE-rejection matrix; that P1 item remains open.

Current source/input SHA-256:

```text
ea1bea729d2ca75980de20214689dc3d9773a7630ff0fd530d28096aac3bc263  evidence/audits/2026-10-07-p1-v11-account-web-e2e.log
aee6dd0f5863bdad8e3ecf52d6880d2797e984ea52cd553c98c38144e01e9878  apps/web/tests/e2e/v11-acceptance.spec.ts
2b212557e66e414f5c1fd681adbdc50d59e3c396a1287d47ae628194919e4579  services/portfolio-risk-service/src/adapters/postgres-account-repository.ts
7e43ed095610fe3671294567617d8a752b47824ad1d852c2677c904b5f423db3  services/portfolio-risk-service/src/application/account-service.ts
cdb5cc3437de08061d0b66d0b5477019eafc7dd5dfe905da9b248508d03e5b39  services/portfolio-risk-service/tests/integration/resource-reservations.spec.ts
f7b86f98b4ff1c821ebb85e835a26a788a3e8ea6a3ec3b53e52ca899c9a66f49  docs/plans/2026-10-06-v1-complete-loop-execution-plan.md
```
