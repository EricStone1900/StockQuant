# W8 current worktree AMD64 image build and boundary smoke — 2026-10-02

## Scope

Built the ten application images from the current worktree for `linux/amd64` under isolated Compose project `stockquant-w8-20261002-current`, using `.env.example`. Both the default service set and optional Web profile completed `docker compose build`. Compose services were not started. These are local Docker image config IDs produced by Mac M1 Docker Desktop emulation, not registry digests or Ubuntu acceptance artifacts.

The machine-readable image IDs and runtime boundary results are in [the boundary JSON](./2026-10-02-w8-current-worktree-container-boundary.json). Platform API includes the latest readiness probe adapter. The 10/10 smoke checked packaged entrypoint, non-root UID, read-only root, no network, and capability/security limits; Web and Research Automation also had no Docker Socket or nonempty secret variables. Market Data wrote only to a fresh temporary volume, which the script removed in `finally`. Qlib Worker loaded Qlib 0.9.6 and LightGBM 4.7.0.

## Verification and resource boundary

- Core Compose build: exit 0; nine service images including Qlib Worker.
- Web profile image build: exit 0.
- `STOCKQUANT_W8_IMAGE_PREFIX=stockquant-w8-20261002-current- node scripts/w8-container-boundary-smoke.mjs`: exit 0, 10/10.
- Host: macOS arm64 Mac Studio; Docker Desktop server 28.0.4, Linux `aarch64` daemon, 10 CPUs and 8,218,034,176 bytes configured memory; Buildx v0.20.2 advertises `linux/amd64` via emulation.
- Host filesystem had 153 GiB available before build. Post-build Docker inventory: 158 images / 38.53 GB total, 13 running containers / 1.225 MB writable layer, 46 volumes / 7.438 GB, 21.31 GB build cache. No build-time peak resource sampling was collected.
- Post-run inventory contained only the existing 13 `stockquant-v12-*` running containers; no W8 smoke container or `stockquant-w8-volume-*` temporary volume remained. No active service, volume, database, schedule, source, or order was changed by the build/smoke commands.

## Limits

This only advances W8's local AMD64 compatibility preparation. It is not an Ubuntu x86_64 host build/run, release provenance, service credential rotation, existing-volume migration, active 48-database backup, live restore/RPO/RTO test, source authorization, or five-trading-day observation. NO_TRADE remains in force and no source/provider request or Paper order was made.
