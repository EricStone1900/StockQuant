# V1.1 unified TestRun storage current-tree re-verification

Date: 2026-09-27 19:26 Asia/Shanghai  
Command: `pnpm test:integration:v11-stage-storage`  
Result: PASS / exit 0

The harness built a randomly named Compose project `sq-v11-stage-1ee379fe6834ab09b4f8` from `infra/compose/docker-compose.v11-integration.yml`, with its own PostgreSQL volume and Platform API configured as `STOCKQUANT_V11_RUN_STORAGE=stage`. Before the recovery test, it compared the documented active-Compose lookup result with the isolated Portfolio container ID and refused to continue unless they matched.

The nested `pnpm verify:stage -- --stage V1.1 --suite code` completed successfully. Chromium then passed all three Web flows:

- normal: created a persistent isolated run and verified backend assertions;
- rejection: persisted denial assertions and verified them through the same-run CLI;
- recovery: restarted only the verified isolated Portfolio container, resumed the same TestRun, and confirmed state survived.

The exact randomized Compose project was removed, including its containers, PostgreSQL volume and network; the harness checked for remaining resources under that project label and found none. The harness only read the active Compose container identity when verifying the recovery target; it did not deploy or restart the active stack. This confirms the current-tree local stage-mode and Web/CLI recovery slice. It does not perform the active API legacy-to-stage cutover, its maintenance/rollback window, or new human acceptance.
