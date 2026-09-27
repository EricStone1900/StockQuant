# V3.4 current-worktree Linux/amd64 compatibility probe (2026-09-27)

## Scope and result

Ran the repository's existing compatibility entry point against the current working tree:

```bash
pnpm verify:compat -- --platform linux/amd64
```

Exit code 0. The command validated Compose configuration, rebuilt the current `platform-api-service` image, then ran its one-shot Node probe with no dependent services. The probe returned `platform=linux`, `arch=x64`, `node=v24.1.0`. The resulting local image was `linux/amd64`, image ID `sha256:7de63e00f2b5ccf9c980dc23842f31a922c1ee07668044847b59db50d3c45cc4`.

The one-shot run used `--rm`; a read-only Docker process listing after completion showed no compatibility probe container. Existing V12 services remained running. The active `platform-api-service` container still uses image `sha256:2d3b6d1c18fd2b190adbad5491ca00e8c09fdc0a87f682f5e96857ef3ad05709`, different from the newly built image; no active service was recreated or deployed.

## Limits

This verifies a current-source amd64 container build and Node runtime probe under Docker Desktop on the Mac host. It does not identify or test the target Ubuntu host/distribution, prove native amd64 hardware behavior, run migrations or restore data, exercise the complete service graph, or satisfy V3.4/Ubuntu acceptance. No activity in the live 20-day collection/Paper observation was reset or inferred from this check. V3.4 remains `NOT_RUN`.
