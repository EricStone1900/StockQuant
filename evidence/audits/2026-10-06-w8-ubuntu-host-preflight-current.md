# W8 Ubuntu x86_64 host preflight

Executed `pnpm verify:w8:ubuntu-host` on 2026-10-06 under controlled local read-only access. Exit code: 2 / `BLOCKED`.

The host is macOS/AArch64 with 10 logical CPUs, 32 GiB memory, and about 140 GiB available disk. Docker Desktop provides Linux/AArch64 (Docker 28.0.4, cgroup v2, 10 CPUs, about 7.65 GiB). It does not match the required Ubuntu x86_64 target. Resource thresholds are not defined and target-host authorization is not confirmed. The script reports that it did not use external networking, read credentials, deploy, migrate, or modify services.

This is a refreshed inventory only. Ubuntu acceptance remains NOT_RUN; the preflight does not authorize treating ARM64 emulation as the target. Machine report: [JSON](./2026-10-06-w8-ubuntu-host-preflight-current.json); input hash: [SHA-256](./2026-10-06-w8-ubuntu-host-preflight-current.sha256).
