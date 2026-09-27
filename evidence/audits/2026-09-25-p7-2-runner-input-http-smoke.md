# P7.2 fenced Runner input HTTP smoke

Date: 2026-09-25 (Asia/Shanghai). Dedicated test database only; no Runner container was started, no model call was made, no order was placed.

The updated research-automation-service image built as `sha256:8bd5241a4dba0c8b5dc935e0d47bfb5498d38659239b45aee5eecae5ca94d3ed`. It was run as a one-off container `stockquant-v31-input-smoke` on localhost port 3018, using only `research_automation_test` and an ephemeral artifact root. Existing research service, platform API, and market-data containers were not replaced or restarted. One-off container ID: `e042232615eb7719a5112022665e093286aa1f2f5b679d42d1bd49b4a643e72a`; it reported healthy.

The fixed HTTP flow published a content-addressed INPUT Artifact under TestRun `input-smoke-mughhr8q`, submitted one DENY-network RunnerJob, claimed it with the Runner Host identity, and downloaded it through the new job-scoped input route. Assertions: publish 201, claim 200, input read 200 with the exact expected SHA-256 `5043ebfe48ea0311e274910255f50935d6a4505f8477390284d0e2608f74d771` and matching content; stale fencing token 409; platform API identity 403. The one-off service was configured with Runner mode `NOT_CONFIGURED`; claim/input protocol verification did not execute the image.

After the 30-second lease naturally expired, the exact isolated test job and input reference were removed from `research_automation_test`; the one-off container was removed. Cleanup results are recorded below after the cleanup command. The active research service and Paper observation services remain untouched.

Limitations: this verifies the HTTP route against an isolated PostgreSQL-backed service and file store, not the Runner Host polling process, safe materialization/extraction, output publication, long-running heartbeats, controller restart recovery, or model execution.
