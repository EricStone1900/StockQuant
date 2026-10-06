# W8 Ubuntu host preflight

Observed 2026-10-06 17:45 Asia/Shanghai using the controlled local read-only host preflight. Result: `BLOCKED`, exit 2.

The host is macOS/aarch64. Its local Docker Desktop runtime is Linux/aarch64, Docker 28.0.4, cgroup v2, overlay2, 10 CPUs and 8,218,034,176 bytes of memory. The project filesystem has 150,302,846,976 bytes available. This is inventory only and does not satisfy Ubuntu x86_64 or release requirements. Resource thresholds remain undefined and target-host authorization is unconfirmed. No network, credentials, deployment, migration, or service mutation occurred.

The same preflight in the ordinary sandbox returned Docker `UNAVAILABLE` because socket access was denied (`operation not permitted`). The controlled read-only rerun established the actual Docker Desktop facts above; the restricted result remains a sandbox limitation, not a host-state measurement.
