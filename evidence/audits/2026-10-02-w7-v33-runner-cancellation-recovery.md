# W7 V3.3 Runner running-job cancellation and late-publish recovery

Date: 2026-10-02 (Asia/Shanghai)

The fixed-pipeline smoke was made port-safe for isolated local runs: its PostgreSQL admin target must be `127.0.0.1`, an explicit valid port, `/postgres`, and the `postgres` user. This allowed a fresh tmpfs PostgreSQL container to bind an ephemeral loopback port while the active V1.2 PostgreSQL service continued on 5433 without interaction.

Command: from `services/research-automation-service`, set `STOCKQUANT_FIXED_PIPELINE_ADMIN_DATABASE_URL` to that disposable admin endpoint and run `STOCKQUANT_V31_PIPELINE_SMOKE_MODE=runner-cancel pnpm v31:fixed-pipeline-cancel-http-smoke`.

Result: PASS, TestRun `d87e8c21-2ef3-4bc4-a8af-9fc8078378ef`, Experiment `8817e062-eb92-4e15-b5ec-f203377d224e`, Job `d87e8c21-2ef3-4bc4-a8af-9fc8078378ef:8817e062-eb92-4e15-b5ec-f203377d224e`, Runner image `sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb`. The running Host container reached Running, platform cancellation moved the job to terminal `CANCELLED`, heartbeat fencing prevented worker progress, the running container was removed, a late output publish returned HTTP 409, no output file or ArtifactRef remained, and the fixed Fixture budget settled exactly once at 23 cents. `provider=FIXTURE`, external calls 0; disposable PostgreSQL cleanup residual count 0.

Retained first invocation failure: before Runner dispatch, the legacy smoke expected `actualCostCents`, while the current gateway contract returns `settledCostCents`; it aborted on that assertion. The script was updated to the current field, and the full smoke passed on a fresh isolated database. No business service or active stack was changed. The smoke is a local Fixture cancellation/recovery slice, not Paper coexistence, production cancellation latency, or Ubuntu evidence.
