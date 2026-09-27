# P7.3 offline Runner container smoke

Date: 2026-09-25 (Asia/Shanghai). No model call, outbound network, broker connection, or trading occurred.

Command: `pnpm v31:runner-smoke` (Docker Desktop Linux/amd64 image on macOS arm64 host; container architecture uses emulation). The script verifies the existing local image identity before running, uses `--pull never`, `--network none`, read-only root filesystem, dropped capabilities, `no-new-privileges`, bounded CPU/memory/PIDs and temporary per-case input/output directories.

Frozen image: `stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593`, expected image ID `sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb`.

Result: exit 0, status PASS. Normal Qlib smoke exited 0; timeout and path-escape cases were rejected with expected exit 2; 128 MiB OOM case was bounded and reported expected Docker exit 247. Each case used a temporary output directory removed by the smoke harness.

This validates the fixed offline image smoke under emulation. It does not prove native Ubuntu behavior, host API claim/heartbeat/completion wiring, lease recovery after controller restart, concurrent production resource enforcement, artifact input/output transfer, model gateway behavior, or real RD-Agent acceptance. `STOCKQUANT_RUNNER_MODE` and model gateway remain `NOT_CONFIGURED`; outbound remains `DENY`.

## Bounded-output and daemon-cleanup follow-up (2026-09-25)

The initial tmpfs `docker cp` attempts did not work: Docker omits tmpfs contents from copy-out, even while a container is running; a tmpfs-backed local volume also yielded no files. Those attempts failed and are not counted as passes. Their disposable containers, volume and temporary directories were removed.

The trusted launch plan now starts a deterministic named container detached, mounts input read-only, and gives `/run/output` a 32 MiB tmpfs. A fixed shell supervisor runs the pinned image's existing Runner entrypoint, emits a completion marker after it exits, and holds the container open for at most 120 seconds. The host follows container logs with an 8 MiB cap, then reads output through `docker exec` using a bounded Python JSON/base64 protocol (64 files, 8 MiB per file, 32 MiB total, depth 16; symlink/hardlink/special files rejected), materializes only safe regular files, and force-removes the container. An outer host timeout or lease cancellation also reaches daemon-side `docker rm --force`; failure to remove the container prevents job completion.

Updated `pnpm v31:runner-smoke` exit 0 on 2026-09-25 using the frozen image ID above, still under Mac ARM64 / Linux amd64 emulation. Five cases passed: normal output transfer with Qlib assertion, Runner's internal timeout, path rejection, 128 MiB OOM, and a 3-second host timeout where the local Docker log client was stopped and subsequent daemon inspection confirmed the container was gone after forced cleanup. The temporary containers were removed. This verifies the Docker control/output mechanics and fixed image; it does not claim a native Ubuntu run, a live Host API job, host-process crash recovery, full concurrency enforcement, model gateway behavior or real RD-Agent acceptance. Runner/Gateway remain disabled.

An offline image rebuild was attempted but cancelled after Docker Desktop had to fetch the digest-pinned base image layers and then `apt-get update` correctly failed under build networking `none`. No newly built image was produced or used; the passing smoke used only the existing frozen image.

## Host claim loop with the frozen Docker executor (2026-09-25)

The isolated end-to-end HTTP smoke now starts standalone Runner Host processes in ISOLATED mode with one exact TestRun scope, claims a real RunnerJob from a temporary research service, reads its hash-checked bundle, launches this frozen image by immutable local image ID with `--pull never` and `--network none`, receives Runner output through bounded `docker exec`, publishes the exact bytes and completes the job. It also SIGKILLs Host 1, waits for lease expiry, then confirms Host 2 claims fencing token 2, removes the prior daemon container and finishes. The >10-second job observes PostgreSQL lease renewal; an old-fence publication returns HTTP 422; output content and SHA-256 match the persisted Artifact. It passed on macOS arm64 with Linux/amd64 emulation; see [P7.2 HTTP/PG evidence](2026-09-25-p7-2-service-identity.md). This does not prove native Ubuntu, long-running production deployment, concurrent resource enforcement, model calls or real RD-Agent acceptance.

## Global Runner slot enforcement (2026-09-25)

The frozen V3.1 setting is one concurrent experiment, but PostgreSQL claims previously limited duplicate claims only per job; two Runner Host processes could lease different jobs at once. `PgRunnerJobStore.claim` now takes a transaction-scoped global advisory lock, checks for any unexpired RUNNING lease, and only then performs its existing row-locked claim. Completing a task frees the slot; an expired lease remains eligible for fencing takeover. This applies across distinct TestRun scopes and Host processes.

The dedicated `research_automation_test` integration suite passes 10/10, including simultaneous claims from two worker IDs against separate TestRuns: exactly one obtains a lease, the active row count is one, completing that job releases the slot, and the second job can then be claimed. A legacy RUNNING row with no lease is also reclaimed at fencing token 1. Existing expired rows from prior runs do not consume capacity. Research service unit tests pass 85/85; lint/build pass. The first integration attempt exposed a stale fixed test clock relative to expired test-database rows; a follow-up test assertion initially selected the wrong TestRun after nondeterministic claim order. Both test assumptions were corrected, and the complete rerun passes. This verifies the database-level single-slot rule; it does not establish aggregate CPU/memory pressure under production host contention or native Ubuntu behavior.

The offline fixed-image smoke now runs six cases and exits 0: normal Qlib output, Runner timeout, path escape, 128 MiB OOM, filesystem isolation, and host timeout with daemon-side container removal. The new filesystem case inspected `/proc/mounts` inside the container and observed root `ro`, `/run/input` `ro`, and `/run/output` `rw`; a write to the mounted input failed while `/tmp` and output writes succeeded. The frozen digest was unchanged. This verifies actual local container mount behavior under Linux/amd64 emulation, not native Ubuntu.

The full `pnpm verify:stage -- --stage V3.1 --suite code` regression also exited 0 after the Runner claim-slot change: research unit 85/85, PostgreSQL integration 10/10, platform API unit 40/40, research lint, platform and Web typechecks, and contracts all passed.
