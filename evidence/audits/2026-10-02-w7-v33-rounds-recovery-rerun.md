# W7 V3.3 two-round Runner recovery rerun

Date: 2026-10-02 (Asia/Shanghai)

## Result

The isolated HTTP/PostgreSQL/Runner Host smoke passed with two deterministic Fixture rounds. TestRun `fdf344aa-c1ca-43bc-b8de-1c0866c355ca`; Job `fdf344aa-c1ca-43bc-b8de-1c0866c355ca:1c129292-b7d6-4b6b-b1a3-632e71ea2047`. The service created the job, the first Host was SIGKILLed while its Runner container remained alive, the lease expired, and a second Host reclaimed the job with fencing token 2. The old container was removed, the lease heartbeat advanced, and all three output artifacts (two round results plus the aggregate) were read through the shared content-addressed store and matched their SHA-256 references. A stale publication from fence 1 returned HTTP 409.

The exact Runner image digest was `sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb`. Inputs were fixed local Fixture code; external model, market-data, and Paper calls were zero. The ephemeral PostgreSQL container used tmpfs and a random loopback port; its labeled-container residual count was zero after cleanup. No active service or database was used or restarted.

## Retained failed attempt and correction

The first run reached a completed, recovered job but the smoke failed while reading published bytes from the old legacy path `root/research/<namespace>/<artifactId>`. The shared Artifact store had already moved bytes to `root/<namespace>/<sha256>/<artifactId>`. This was a stale test-reader assumption, not missing persisted content. The smoke now reads through `LocalArtifactContentStore` using the exact namespace, artifact ID, and SHA-256 in each immutable reference. The corrected full two-round recovery run passed as recorded above; the failed run was not counted as PASS.

## Limits

This validates one deterministic small Fixture job and recovery path only. It is not the V3.3 Experiment-to-round business workflow, real RD-Agent/model execution, checkpoint semantics, capacity/resource profiling, Paper coexistence, full Web/CLI scenario acceptance, Ubuntu validation, or human sign-off. W7 and V3.3 remain incomplete.
