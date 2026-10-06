# W8 Ubuntu host preflight, current task context (2026-10-06)

`pnpm verify:w8:ubuntu-host` exited 2 / `BLOCKED`. This invocation identified the local host as macOS/aarch64, with 10 logical CPUs, 32 GiB memory, and approximately 150.7 GB available disk; the container runtime probe returned `UNAVAILABLE`. The target must be Ubuntu x86_64, its resource thresholds are not defined, and target-host authorization is not confirmed.

This differs from an earlier same-day preflight that could read Docker Desktop's Linux/aarch64 runtime. These are task-shell observations, not a change in the deployment target. Neither result supplies Ubuntu-host evidence. No external network, credentials, deployment, migration, or service changes occurred. Machine result: [JSON](./2026-10-06-w8-ubuntu-host-preflight-current-context.json); [SHA-256](./2026-10-06-w8-ubuntu-host-preflight-current-context.sha256).
