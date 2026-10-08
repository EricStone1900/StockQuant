# V1.5 code suite with isolated Quant Python boundary tests

Date: 2026-10-07 (Asia/Shanghai)

Command: `pnpm verify:stage -- --stage V1.5 --suite code` from the repository root. Exit code: 0.

The first current-environment run failed because the host sandbox denied the Python Worker test's random loopback bind. The Quant Research `test:worker` command now invokes the same 14 Python tests in a disposable Linux container. It uses the preinstalled image `python@sha256:e41613d42d4891e4930f79523f93f81bbc7632584ec65e36ab055f41a800b41e` (`linux/arm64`, local image ID `sha256:829cc065f506a60d332260af9fc48c590d60cfeff8bfc20df57b7baf20edb879`), `--network none`, a read-only root filesystem, a 64 MiB temporary filesystem, and the repository mounted read-only at its original path. The runner does not pull or build images; a missing Docker daemon or image returns exit 2.

The worker HTTP boundary tests ran against the actual `qlib-worker.py` subprocess and retained TCP loopback requests inside the isolated container. All 14 Python tests passed. The full code suite also passed the documentation/link audit (4,960 links), contract/schema/fixture validation (287 JSON files, 203 schemas, 45 fixtures), service layer checks, workspace build/typecheck, and unit suites: Web 1, Governance 40, Historical Replay 25, Market Data 74, Portfolio 5, Trade Execution 86, Quant Research TypeScript 99 and Python 14, Platform API 232, Research Automation 218.

The complete command log and its SHA-256 are in the adjacent `.log` and `.sha256` files. This code-suite result does not change V1.5's business workflow state: Temporal still executes only the `normalizeEvent` infrastructure probe, business assertions remain WAITING/NOT_RUN, and no orders, fills, ledger facts, 60-session dual-market observation, restart recovery, backup restore, user acceptance, or V1 release gate are claimed by this audit.
