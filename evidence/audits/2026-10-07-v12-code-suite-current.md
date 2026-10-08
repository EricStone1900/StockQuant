# V1.2 current-worktree code suite

Date: 2026-10-07 (Asia/Shanghai)

Command: `pnpm verify:stage -- --stage V1.2 --suite code` from the repository root `/Users/huangbosong/Documents/ChatGPT/StockQuant`.

The ordinary sandbox attempt stopped in `services/quant-research-service/tests/test_qlib_worker.py` because binding a random loopback socket returned `EPERM`. That failure was retained in the execution transcript. The same command was then rerun in the controlled local environment and exited 0. The complete output is in [the suite log](./2026-10-07-v12-code-suite-current.log).

The suite ran the real baseline checks (Markdown links, contracts/generator drift, Fixtures, service-layer rules, operational tests), service unit/type/build checks, isolated PostgreSQL and HTTP persistence/recovery checks, Market Data Artifact task restart, locked Qlib 0.9.6/LightGBM 4.7.0 CPU fit smoke, and the isolated V1.2 Web/API/CLI E2E. The E2E used project `sq-v12-e2e-c032864dddfd6f6d400a`, verified four separate TestRuns (`e234f70e-387c-4976-9a22-b2df502dfd6c`, `697d38c5-e624-4ef5-8526-3d4367bd18a3`, `6cfb125e-4916-43c3-a128-65ccd33b5b15`, `dec61fff-e6c0-407c-a2d0-3151eb90d205`), actual CN/US Qlib fits, Governance snapshot assertions, cancellation with no Artifact, Platform restart recovery and same-Run CLI checks. Harness cleanup reported PASS. The E2E report and its full input hash manifest are [here](./2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-c032864dddfd6f6d400a.json) and [here](./2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-c032864dddfd6f6d400a.sha256).

The source hashes captured during this suite run are in the [historical execution snapshot manifest](./2026-10-07-v12-code-suite-current.sha256); later source or documentation edits are not expected to match that snapshot.

This establishes engineering/code-suite evidence for the current V1.2 scope. It does not recover the missing historical TestRun export, certify real-market data or Ubuntu, or record new human acceptance. V1.2 remains `PARTIALLY_IMPLEMENTED` and the V1 version gate remains `INCOMPLETE`.
