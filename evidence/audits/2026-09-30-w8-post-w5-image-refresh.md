# W8 AMD64 image refresh after W5 integration changes

Date: 2026-09-30 (Asia/Shanghai). Rebuilt the current worktree in a separate Compose project; no service was started.

- Target: `linux/amd64`, emulated on Apple Silicon (`arm64`).
- Build project: `stockquant-w8-20260930-post-w5-refresh`.
- Built 10 current-worktree application images from the frozen pnpm lock and current Compose file; image IDs and runtime users are listed in [the JSON inventory](2026-09-30-w8-post-w5-image-refresh.json).
- `pnpm verify:w8:container-boundary` exited 0 for all 10 images. Each disposable container used `--network none`, read-only root, dropped capabilities, `no-new-privileges`, and non-root UID. Qlib Worker imported Qlib 0.9.6 and LightGBM 4.7.0. Market Data wrote only to its disposable named volume.
- The temporary volume and smoke containers were cleaned; no active Compose resource, volume, database or service was touched.

This is current-worktree AMD64 emulation evidence only. It does not prove Ubuntu behavior, full-stack service readiness, live deployment, or migration of active data volumes.
