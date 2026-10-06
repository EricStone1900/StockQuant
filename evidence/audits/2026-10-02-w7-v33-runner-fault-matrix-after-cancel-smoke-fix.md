# W7 V3.3 fixed-pipeline Runner fault matrix after smoke contract repair

Date: 2026-10-02 (Asia/Shanghai)

The same `v31-fixed-pipeline-http-smoke.mjs` was run sequentially against a disposable PostgreSQL admin container bound to an ephemeral loopback port. Each smoke created and dropped its own random database and exact TestRun/Experiment/Job/artifact rows. Runner image: `sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb` (`linux/amd64`). All modes use an explicit deterministic model Fixture (23 cents), network DENY policy, Fake broker, and no external provider call.

| Mode | TestRun | Experiment | Result | Key assertions |
|---|---|---|---|---|
| `runner-failure` | `ed461d53-077c-4430-abb1-613b8a794c6d` | `a41f9130-3db7-40b2-9c9d-9406f15df09e` | PASS, FAILED | exit 17 persisted; no output; Fixture budget settled once |
| `runner-timeout` | `5a33a521-b486-4edd-a2fc-85b0989c751a` | `1675b751-991c-48ca-81fa-35e73bde0c2a` | PASS, TIMED_OUT | one-second timeout; container removed; no output; settled once |
| `runner-network` | `e7b47f46-8db0-4975-8e41-223a699ef2f4` | `bf60aef6-bdcc-4e68-a0b9-6a59aabc16cd` | PASS, FAILED | TEST-NET connection denied; container removed; no output; settled once |
| `runner-oom` | `9b819f02-a219-4ced-9ab3-8fd76652fda4` | `ce8e7f32-47f1-465d-b21e-062ad605f6fd` | PASS, FAILED | 128 MiB bounded OOM exit 247; container removed; no output; settled once |

Each mode had external calls 0, no published output Artifact, and budget status SETTLED with 23 cents. The temporary PostgreSQL labeled residual count was 0. The prior cancellation/recovery smoke also passes separately and is recorded in `2026-10-02-w7-v33-runner-cancellation-recovery.md`.

Retained setup failures: the first shell orchestration attempt had a malformed `[` conditional and exited before any scenario; its trap removed the temporary database and a read-only container check confirmed no residual. A later cancellation attempt exposed an obsolete `actualCostCents` assertion before Runner dispatch; the smoke was corrected to the current `settledCostCents` contract and the full cancellation test passed. Neither failure represents a business-scenario failure. The fault matrix validates deterministic isolated Runner boundaries only; it does not prove RD-Agent TestRun orchestration, real provider settlement, Paper coexistence, production capacity, or Ubuntu behavior.
