# W7 V3.3 Runner 100k-row repeat variance sample

Date: 2026-10-02 (Asia/Shanghai)

## Frozen conditions

Three sequential fresh TestRuns use the same 100,000-row JSONL payload (2,678,580 bytes; expected checksum 4,799,685), same Runner image digest `sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb` (`linux/amd64` under Mac arm64 Docker emulation), two rounds, concurrency 1, 500m CPU, 512 MiB memory, 32 PIDs, 30-second timeout, DENY network, and the same recovery-observation delay. Each run used an independently created tmpfs PostgreSQL container on a random loopback port; all three were removed and each labeled residual count was 0. No Provider, market-data or Paper endpoint was called.

## Results

| TestRun | Runtime | Sampled CPU peak | Sampled memory peak | PIDs | Managed files | Artifact bytes | Outcome |
|---|---:|---:|---:|---:|---:|---:|---|
| `51d4f103-c125-468a-93cf-1c2a7fd45fce` | 12,193 ms | 34.85% | 35,745,956 B | 3 | 5,358,919 B | 223 B | PASS |
| `9e6c2a69-c752-449e-82ee-99ed3d149657` | 12,203 ms | 35.46% | 37,004,247 B | 3 | 5,358,919 B | 223 B | PASS |
| `ef956463-063e-47e7-ad2e-b0ffedb68c7d` | 12,127 ms | 38.55% | 35,745,956 B | 3 | 5,358,919 B | 223 B | PASS |

All three runs also passed exact row/checksum assertions, two Fixture rounds, Host SIGKILL recovery, lease takeover with fencing token 2, prior-container removal, artifact SHA-256 checks and stale-fence publish HTTP 409. All three published the same content hashes. Runtime mean is 12,174 ms, range 12,127–12,203 ms; sampled memory peak range is 35,745,956–37,004,247 B. CPU/memory are sampled every ~2.5–2.9 seconds and may miss peaks. Runtime includes the fixed recovery delay and is not a throughput measurement. Three deterministic synthetic runs do not prove production variance, Ubuntu performance, multi-job concurrency, Paper coexistence, or broad workload capacity.
