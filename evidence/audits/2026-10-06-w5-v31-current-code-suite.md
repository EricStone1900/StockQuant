# W5 V3.1 current-worktree code regression

Date: 2026-10-06 (Asia/Shanghai)

## Result

`pnpm verify:stage -- --stage V3.1 --suite code` passed with wrapper exit code 0 after building and pinning the current-source Research Automation image: `sha256:b3abd68b0c9b1e76ef6fa51bdf77c58d9ab790688b69b4f21c735ebfeab4bd57` (`linux/arm64`). The full successful transcript is [the suite log](./2026-10-06-w5-v31-current-code-suite.log); it records `wrapper_suite_exit_code=0` and stage `status=PASS`.

Research Automation had 218/218 unit tests and 32/32 PostgreSQL integration tests; its LiteLLM-compatible HTTP Fixture smoke, production-settlement rejection smoke and internal RD-Agent backend smoke passed. The pinned RD-Agent `LiteLLMAPIBackend` completed Fixture chat and embedding requests over an internal-only network. Both budget rows settled exactly (`requested=120 cents`, `reserved=120 cents`, `spent=46 cents`, two rows); external provider calls were zero. Platform had 198/198 unit tests, and the Artifact owner-scope/export HTTP smoke passed. The disposable image smoke TestRun was `c647d10c-a812-43fa-94a7-eec80a9e174a`; active services were untouched.

The current-source image was checked against its exact ID before use and removed after the suite; the unique image tag is absent. The source hashes are a **historical execution snapshot** binding this run’s inputs, not the current worktree ([input manifest](./2026-10-06-w5-v31-current-code-suite.sources.sha256)); image identity is also retained there. Disposable containers and the internal-only network were cleaned by the smoke script.

## Preserved failures and limits

The first sandbox attempt exited 1 because loopback binding returned `EPERM`. A controlled retry first exited 2 because the exact image ID was not supplied, and a subsequent attempt exited 1 because the old default image tag did not match the new ID. Both prerequisites were corrected without weakening the digest check. The successful run supplied both the unique image ref and exact digest.

This is an offline code/Fixture regression only. Provider authorization remains disabled; there was no real RD-Agent business experiment, external model/provider call, market data call, Paper/Broker call, active deployment, invoice-grade billing reconciliation, Ubuntu execution, or human acceptance. V3.1 and the overall V3 version remain formally incomplete.
