# W7 V3.3 single-slot Runner capacity sample

Date: 2026-10-02 (Asia/Shanghai)

## Run and measured result

Command: `pnpm --filter @stockquant/research-automation-service v33:runner-host-rounds-recovery-http-smoke` with the command's required Docker resource metrics enabled. The isolated run used deterministic local Fixture code, one Runner slot, two sequential output rounds, and the existing immutable Runner image `sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb`.

- TestRun: `2c75561a-debe-4303-bb56-339afb6632c6`.
- Job: `2c75561a-debe-4303-bb56-339afb6632c6:167de0ac-810e-4eab-a8c5-88230da8b6dc`.
- Declared and observed Docker limits: 500 milliCPU (`NanoCpus=500000000`), 512 MiB, 32 PIDs.
- Five Docker stats samples during the reclaimed Runner attempt: peak sampled memory 35,211,182 bytes (6.6% of the 512 MiB limit), peak sampled CPU 32.61%, peak PIDs 3. Docker's periodic sample granularity is about 2.5–2.9 seconds for this local environment; this is sampled peak, not a continuous maximum.
- Runner execution duration: 11,762 ms. Host-managed input/output files: 1,154 bytes. Published content-addressed output bytes: 112 bytes across two round outputs and one aggregate.
- Recovery assertions also passed: Host SIGKILL, lease takeover, fence token 2, prior container removal, exact artifact SHA-256 reads, and stale fence HTTP 409.
- External model calls and market/Paper calls: 0. Model/provider spend: 0 cents; this does not measure Docker/host infrastructure cost.
- Random temporary PostgreSQL container used tmpfs and a random loopback port; exact labeled container residual count after cleanup was 0.

## Limits

This is the first measured point at a tiny synthetic input, two output rounds, and concurrency 1. It does not meet the W7 data-scaling matrix, real experiment/business-round orchestration, sustained concurrency/backpressure/cancellation profile, production filesystem or cost budget, Paper/collection coexistence, Ubuntu capacity, or human acceptance. The success must not be extrapolated to larger datasets or host architectures. W7 remains incomplete.
