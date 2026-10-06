# W2 / V2.4 current-worktree regression

Date: 2026-10-06 (Asia/Shanghai)

## Result

`pnpm verify:stage -- --stage V2.4 --suite code` passed with exit code 0 after the default sandbox attempt failed at the Quant Research Python worker test while binding a temporary `127.0.0.1` socket (`PermissionError: [Errno 1] Operation not permitted`). The first failure is retained in `2026-10-06-w2-v24-current-worktree-sandbox-failure.log`; the identical command was rerun with controlled local test permissions.

The passing suite included repository docs/contracts/fixtures and generated-client checks, build/lint/typecheck, service unit and isolated PostgreSQL integration checks, Paper readiness container smoke, and the V2.4 HTTP/Web/Chromium run. The HTTP smoke created four new API TestRuns for `normal`, `rejection`, `recovery`, and `external-reconciliation`; all completed with their declared assertions PASS and same-Run CLI checks exit 0. Four browser scenarios also passed. Fault evidence includes three dropped execution responses, original-order lookup during UNKNOWN, Portfolio commit response loss followed by service restarts and exactly-once Outbox recovery, concurrent isolated Runs, and zero-side-effect identity/scope/LIVE/snapshot rejection checks. Machine detail is in [the smoke report](./2026-10-06-v24-paper-smoke-8f93567c6d1f4246bf4fcf73cb6e9787.json); the five pre-cleanup isolated database snapshots and their SHA-256 values are recorded there and verified against the files.

All tests used `FIXTURE` data and `FAKE` broker. The report says `activeServicesTouched=false`, `sourceRequests=0`, scheduler/executor disabled in the isolated collection check, and the temporary Web image/container were removed. This is a current-code regression of the isolated V2.4 engineering path; it does not change source authorization, O1/O2 observation, active deployment, Ubuntu evidence, human acceptance, or the version gate.

## Scope boundary

- The HTTP/DB and browser checks ran against temporary local services and disposable PostgreSQL databases.
- No market Provider, collection, Paper activity, or real broker was invoked.
- `NO_TRADE` and source authorization `NONE` remain in effect.
- V2.4 engineering regression is PASS; the overall stage/version remains subject to its observation and human acceptance gates.
