# C5 隔离 Fixture Worker 进程中断恢复（2026-10-28）

在隔离 PostgreSQL、真实 Platform/Market Data/Portfolio 等本地进程及 FakeBroker 范围运行 `node scripts/run-isolated-postgres-command.mjs --admin-env V24_PAPER_SMOKE_ADMIN_DATABASE_URL -- pnpm --filter @stockquant/platform-api-service v24:paper-http-smoke`。测试显式启用默认关闭的 Fixture Worker，使用仅限测试的 Market Data 代理，在日线完成事实读取处暂停请求；确认任务第一次 `CLAIMED` 后对承载 Worker 的隔离 Platform 进程发送 `SIGKILL`，重启同配置进程并等待原 30 秒租约自然到期。

[完整隔离报告](./2026-10-28-v24-paper-smoke-711cf7eaa5b24858bb266e5ca07bf12e.json)为 PASS：TestRun `58c4f25e-2411-4192-8a43-df5791d0f6a7` 原任务第二次领取并 COMPLETED，持久目标恰好一条，决策为 `PAUSED` 且没有订单身份；Broker订单/成交、Portfolio成交/预留及 outbox 数量未增加。原依赖服务中断恢复及既有六个浏览器场景和各自同 Run CLI 也通过；数据库快照已导出，未连接活动服务。该场景为合成 Fixture，未访问真实来源。

本次只覆盖目标写入之前进程终止后的真实租约接管；目标已提交但任务尚未完成时的真实进程崩溃仍未验证（已有隔离 PG 状态测试），Platform 创建流程各提交点崩溃亦未逐点验证。新入口正式 Web 及其同 Run 验收、活动授权、真实时钟持续链和20日观察仍未完成；C5 保持 PENDING，人工验收未执行。
