# W7 V3.3 Runner data-scale samples: 1,000, 10,000, and 100,000 rows

Date: 2026-10-02 (Asia/Shanghai)

## Frozen setup

Both runs use the same immutable Runner image `sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb` (`linux/amd64`), on the local `arm64` host through Docker's amd64 emulation. Each run uses one active Runner slot, two deterministic Fixture output rounds, 500m CPU, 512 MiB memory, 32 PIDs, 30-second task timeout, DENY network, and the same artificial 11-second delay used to make lease takeover observable. The job streams JSONL rows, computes count/checksum, and asserts exact expected results. Each run uses its own tmpfs PostgreSQL container and random loopback port; both cleaned with labeled container residual count 0. Model, market-data, and Paper calls are zero.

## Measurements

| Fixture rows | TestRun | Input bytes | Checksum | Runner time | Sampled CPU peak | Sampled memory peak | PIDs peak | Host-managed files | Published output bytes |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1,000 | `fc8e8a76-c9ec-4783-b72f-28ccb169af3d` | 24,780 | 46,995 | 11,896 ms | 34.35% | 35,232,154 B | 3 | 51,303 B | 211 B |
| 10,000 | `554cf09c-61b4-41b6-814f-4164a192a2a2` | 257,851 | 479,604 | 11,854 ms | 35.00% | 35,232,154 B | 3 | 517,453 B | 217 B |
| 100,000 | `6c19091a-80d8-4af6-87d5-45d6ed46c2c5` | 2,678,580 | 4,799,685 | 12,239 ms | 34.57% | 35,494,298 B | 3 | 5,358,919 B | 223 B* |

All three runs passed Host SIGKILL recovery, expired lease takeover with fencing token 2, prior-container removal, output content SHA-256 checks, and rejection of a stale-fence publish with HTTP 409. The 100,000-row Job was `6c19091a-80d8-4af6-87d5-45d6ed46c2c5:0da1f08c-6571-4e55-8188-0654bc0a9f8a`. The 1,000-row run's Job was `fc8e8a76-c9ec-4783-b72f-28ccb169af3d:f2e5bc6c-23ee-40cf-bf49-fc3ed3a07342`; the 10,000-row Job was `554cf09c-61b4-41b6-814f-4164a192a2a2:f2005114-4183-4515-b7c8-6f026f1c5de4`.

Provider charge was 0 cents because no model call occurred; Docker/host infrastructure cost was not measured. Docker stats were sampled about every 2.5–2.9 seconds, so recorded maxima are sampled, not continuous peaks. Both execution durations are dominated by the fixed 11-second delay and are not throughput benchmarks. From 1,000 through 100,000 rows, input and host-managed files scale about 108x/104x while sampled memory stays near 35.5 MB and runtime remains dominated by the fixed delay; this supports only this streaming fixture path. These three data points do not establish production capacity, sustained peak usage, Ubuntu performance, or arbitrary dataset behavior.

## Retained failed invocation

The first 10,000-row attempt invoked the script from the repository root; its service child resolved `dist/bootstrap/main.js` relative to that incorrect working directory and failed before the workflow started. Its ephemeral database was removed by the trap. The successful rerun used the Research Automation service directory, matching the package command's working directory. The failed invocation is not counted as a test failure of the business flow and was not counted as PASS.

The 100,000-row published artifact bytes are 223 total across the three outputs (the smoke output reports 223 content bytes). W7 still lacks larger frozen tiers, repeated-run variance, queue/backpressure and cancellation capacity, workload cost budget, actual Experiment-to-round dispatch, Paper/collection coexistence, and Ubuntu validation. This evidence does not close W7.

## Retained verification failure

The first post-documentation Research Automation unit-suite invocation ran in the restricted sandbox: 188/191 passed and three loopback-only proxy tests failed with `listen EPERM` before exercising their assertions. The same full suite was rerun in the authorized controlled local environment and passed 34/34 files, 191/191 tests. `pnpm build`, `pnpm lint`, repository `pnpm baseline:check` (including 2,223 Markdown links), and `git diff --check` passed. No external network, market, Provider, or Paper endpoint was used.
