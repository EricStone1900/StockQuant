# W8 current V3.2 Platform and Web image build

Date: 2026-09-30. Host: Mac M1 / Docker Desktop `linux/aarch64`; target: `linux/amd64` emulation.

The current worktree was built with the checked-in Dockerfiles and frozen lockfile. These are local audit tags only; no image was pushed and no Compose service was started, replaced, or restarted.

| Service | Tag | Local image ID | Platform | Configured user | Build result |
|---|---|---|---|---|---|
| Platform API | `stockquant-w8-v32-platform-api:20260930` | `sha256:87ae0c894f84b448e78b96c0ad54b9d6ab9a764b38f64ef3fa6122530e42130f` | `linux/amd64` | `node` (UID 1000 in probe) | Docker build and Platform TypeScript build passed |
| Web | `stockquant-w8-v32-web:20260930` | `sha256:4f8a9b792bbbcf902a1712b89098b92406149c65a75c61033fed14e98f724da2` | `linux/amd64` | `node` (UID 1000 in probe) | Docker build, Web typecheck and Vite production build passed |

Each image was run separately with `--network none`, `--read-only`, a temporary writable `/tmp`, `--cap-drop ALL`, `no-new-privileges`, and 64 PIDs. The probes verified the expected app bundle exists, the process is non-root, `/tmp` is writable, and `/workspace` cannot be modified. Both probes passed. Containers used `--rm`; no persistent volume, Compose project, database, or active service was involved.

This confirms current-worktree image construction and static container boundaries under Mac-hosted AMD64 emulation only. It does not confirm real Ubuntu compatibility, application startup/readiness against dependencies, service Bearer deployment, current database compatibility, a full-stack Compose run, release provenance/signature, or human acceptance. Do not use these tags as a production release without the W8 release gates and Ubuntu verification.
