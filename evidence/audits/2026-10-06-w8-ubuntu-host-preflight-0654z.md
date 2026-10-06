# W8 Ubuntu host preflight (2026-10-06 14:54 Asia/Shanghai)

Executed `pnpm verify:w8:ubuntu-host` against the current host. The audited command is read-only: it reads `/etc/os-release`, local CPU/memory/filesystem capacity and local Unix-socket Docker context/info; it does not contact a registry, read credentials, alter containers, or perform migrations.

Result: `BLOCKED`, exit 2. The host is macOS/aarch64 with 10 logical CPUs, 32 GiB memory, and 150,749,036,544 bytes available on the project filesystem. Local Docker Desktop is available and reports Linux/aarch64, Docker 28.0.4, cgroup v2, overlay2, 10 CPUs and 8,218,034,176 bytes memory. This corrects the older 2026-10-05 note that Docker runtime was unavailable in its execution context; it does not change the target requirement.

`targetIsUbuntuX86_64=FAIL` and `linuxContainerRuntimeMatchesTarget=FAIL`; approved resource thresholds remain `NOT_DEFINED` and target-host authorization remains `NOT_CONFIRMED`. Therefore this is Mac/Docker ARM64 inventory only, not Ubuntu evidence or release readiness. No container was started, stopped, or replaced; the current 13 StockQuant containers were left unchanged. No network, credentials, database, migration, or deployment was used.

Machine-readable output: [preflight JSON](./2026-10-06-w8-ubuntu-host-preflight-0654z.json). The previous 2026-10-05 failure record is retained as historical evidence.
