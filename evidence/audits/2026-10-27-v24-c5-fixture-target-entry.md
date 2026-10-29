# V2.4 C5 隔离 Fixture 目标入口记录（2026-10-27）

范围：两日合成日线完成事实、独立账户与默认关闭的后台 Fixture 目标任务。入口固定输入并创建独立 TestRun；所有者可读取任务及目标。此入口不启用活动 Mandate、真实来源、常驻 Paper 或交易。

- 冻结输入：`c5-prior-daily-20261014` SHA-256 `f278c8f083b2d6109a3b38f53e453825ab6ad857a9e72a03bfaf770f1ba7b8ed`；`c5-prior-daily-20261015` SHA-256 `240606228b58b9f94f32fea5b8da6c601a9827d2f338b2657d55d32175a5ab9d`。证券 `600000.SH`，收盘价分别为 10.0000、10.2500；详细来源和时间语义见各自 manifest。
- `pnpm contracts:check`、`pnpm fixtures:check`、Market Data 和 Platform typecheck、Market Data Fixture 单测（8/8）通过；Market Data 隔离 PostgreSQL/HTTP 烟测通过。
- [隔离多服务报告](./2026-10-27-v24-paper-smoke-2b15fe4d304a417ebf2fbc6b9b6cceca.json) PASS，命令 `node scripts/run-isolated-postgres-command.mjs --admin-env V24_PAPER_SMOKE_ADMIN_DATABASE_URL -- pnpm --filter @stockquant/platform-api-service v24:paper-http-smoke` 退出 0。测试中显式开启 Fixture Worker；TestRun `06c10a1e-a76e-43f1-bed1-ce6510bfd3f9` 的任务 COMPLETED，目标 `PAUSED/MANDATE_INACTIVE`，包含两条持久日线完成身份，无订单身份；订单、成交、预留和 outbox 数量未增加。同 Run 的 CLI `--check-only` 退出 2，阶段状态仍为 WAITING。现有六个浏览器场景及其同 Run CLI 也通过，但它们不构成新入口的浏览器验收。
- 测试数据库快照已导出，隔离容器、网络和临时 Web 镜像已清理；`activeServicesTouched=false`，真实来源请求为零。

仍未完成：新入口的正式 Web 操作及同 Run 浏览器验收；创建过程中进程中断后的可恢复初始化；真实进程故障注入和原 Run 恢复；真实时钟持续链、活动授权、日终自动化及 20 个合格交易日。后台目标完成不代表阶段完成，C5 和 V2 仍未通过，用户验收未执行。
