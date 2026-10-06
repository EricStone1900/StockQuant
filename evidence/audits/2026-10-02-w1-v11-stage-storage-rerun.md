# V1.1 isolated stage-storage rerun — 2026-10-02

## Commands and results

- `pnpm verify:stage -- --stage V1.1 --suite code`: PASS, exit 0. The run completed baseline (including contracts and fixture validation), workspace build, lint, unit tests, and contract checks. Market Data 70 unit tests, Research Automation 182, Platform API 153, Trade Execution 58, Replay Worker 25, Decision Governance 22, Quant Research 67 TypeScript and 13 Python tests passed; remaining workspace checks also passed.
- `pnpm test:integration:v11-stage-storage`: PASS, exit 0. The runner built and started a randomly named Compose project with random per-role PostgreSQL credentials, confirmed stage-mode storage, and verified that its recovery restart target was the isolated Portfolio container.
- Chromium normal, rejection, and recovery scenarios passed 3/3. TestRun IDs: `4de709f6-858a-4877-91c6-1ee11c0aa70e`, `b5adea1d-66a6-47e2-8779-88709f27ff74`, and `2725b123-df9a-402b-8f5a-bfdb2e573aae`. Each scenario performed a same-run CLI read; recovery restarted only the verified isolated Portfolio container.
- The integration runner reported `exactContainersAndVolumesRemoved=true`, `exactImagesRemoved=true`, and resources removed: containers, volumes, networks, and images. The active `stockquant-v12-*` services were not targeted.

## Limits

This verifies the current source in an isolated local stack. It does not execute the V1.1 activity API storage cutover or rollback, validate a production user session, or constitute user acceptance of the new scope. V1.1 remains `PARTIALLY_IMPLEMENTED` pending those gates.
