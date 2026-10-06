# W8 current-worktree AMD64 image and isolation rerun — 2026-10-03

Built ten `linux/amd64` local image candidates from the current source tree under unique tag prefix `stockquant-w8-20261003-current-`; Compose build exited 0 and started no services. The source-set fingerprint is `sha256:59c51d1214592c21bc7319d94fe17776d67c23ca02bcf8c338a30dec0a4dfec2`. Exact config IDs and input hashes are in the [machine report](./2026-10-03-w8-current-worktree-amd64-rerun.json) and [source manifest](./2026-10-03-w8-current-worktree-amd64-rerun.sources.sha256). The build fetched pinned build-base images/dependencies but did not push or deploy candidates.

The isolated boundary smoke exited 0 with 10/10 images passing non-root, read-only-root, network-none and capability restrictions; Web/Research Automation had no Docker socket or nonempty secret environment. Qlib 0.9.6 and LightGBM 4.7.0 loaded. SCRAM smoke exited 0: all nine temporary roles accepted correct credentials and rejected blank and wrong passwords. Bearer preflight found eight independent configured identities, mode 0600, no duplicates; no credentials were printed or applied to active services.

Host inventory is BLOCKED: the host is macOS/aarch64 and Docker Desktop runs linux/aarch64, not the target Ubuntu x86_64. Post-test Docker inventory showed all 13 pre-existing `stockquant-v12-*` containers still running; no W8 temporary container or volume remained. No market, model Provider, Paper or Broker call occurred.

This closes a current-source local image/security preparation pass only. It does not close Ubuntu deployment, active-cluster backup/restore, credential rotation, production migration, RPO/RTO or five-day Ubuntu observation.
