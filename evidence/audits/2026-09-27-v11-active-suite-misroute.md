# V1.1 Code Suite Active-Stack Misroute and Safeguard (2026-09-27)

## Incident

The command `pnpm verify:stage -- --stage V1.1 --suite code` was run without `STOCKQUANT_PLATFORM_API_URL`. In this repository, the V1.1 code-suite branch also invoked the generic `test:integration` command, whose V1.1 scenarios defaulted to `http://127.0.0.1:3000` and whose recovery path restarted the Portfolio Risk service in the default Compose project. This was inconsistent with the plan's isolation requirement.

The active `stockquant-v12` Platform API accepted and completed three FIXTURE/FakeBroker TestRuns:

| Scenario | TestRun ID | Account ID | Result |
|---|---|---|---|
| normal | `0877e4c3-f0e1-42f6-b014-c70907350457` | `c7fad0ef-996e-4f5f-b0de-eae67e1524e7` | COMPLETED; account idempotency and initial ledger assertions PASS |
| rejection | `f7ad899d-3819-4acb-8b3a-b768530e705a` | `44a90cf0-f923-4b52-89da-d1c8499d6c4d` | COMPLETED; owner-scope and idempotency-conflict assertions PASS |
| recovery | `71593048-f829-4355-8c84-a1fe2d8f5a7c` | `17c86c4b-3456-47a0-8f0e-21cb5d2eabc0` | COMPLETED; post-restart snapshot and run-isolation assertions PASS |

The recovery command restarted `stockquant-v12-portfolio-risk-service-1`. Immediately afterward, `docker ps` showed the V12 services running and the Portfolio Risk container healthy; `GET http://127.0.0.1:3000/ready` returned `{"status":"ready","service":"platform-api-service","brokerMode":"FAKE"}`. These are application-test TestRuns/accounts in the active environment and are intentionally retained as evidence; this audit does not claim an independent database-wide before/after comparison. No real-broker path was used. The V1.1 code-suite command exited 0 after the three scenarios and baseline checks.

## Correction

- Removed the business-scenario `test:integration` invocation from the V1.1 `--suite code` branch; it now runs baseline, build, lint, workspace tests, and contract checks without creating TestRuns or restarting a service.
- V1.1 business scenarios now require an explicit `STOCKQUANT_PLATFORM_API_URL`. The supported isolated end-to-end entry remains `pnpm test:integration:v11-stage-storage`, whose recovery guard verifies the target container belongs to its temporary Compose project before restart and whose cleanup checks remove only that project's named resources.
- Do not rerun or delete the three active TestRuns/accounts. Subsequent V1.1 code evidence must distinguish this incident run from isolated stage-mode validation.

## Isolated Retest After Correction

`pnpm test:integration:v11-stage-storage` exited 0 after the correction. It created temporary Compose project `sq-v11-stage-d01b1b1f096ba43b6489`; its nested V1.1 code suite passed baseline, build, lint, unit tests, and contracts. Playwright normal, rejection, and recovery passed 3/3 against the isolated API/Web. The recovery test restarted only the guarded isolated Portfolio container. The harness removed its exact containers, volume, and network and confirmed no project-labeled resources remained. TestRun IDs from this temporary database were `f196c5fd-a9f3-4f88-be4a-75c3c218543a`, `1245a5fd-3658-4b11-94ea-fefe3b702338`, and `1f1c3848-7f11-414d-87b4-f1f69761a06e`.

## Status

After the isolated retest, all `stockquant-v12` containers were running; Portfolio Risk and other health-checked services were healthy, and Platform `/ready` again returned ready with `brokerMode=FAKE`. No subsequent active-service mutation was performed during this health check. The active-stack run is not counted as isolated acceptance or new user sign-off.
