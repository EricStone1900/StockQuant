# C5 隔离目标提交后进程中断（2026-10-28）

定向命令：`V24_PAPER_SMOKE_SKIP_WEB=true node scripts/run-isolated-postgres-command.mjs --admin-env V24_PAPER_SMOKE_ADMIN_DATABASE_URL -- pnpm --filter @stockquant/platform-api-service v24:paper-http-smoke`，退出 0；[隔离报告](./2026-10-28-v24-paper-smoke-4ce2d27723544ca6b88f347108630304.json)。使用隔离 PostgreSQL 和本地服务，测试显式启用 Fixture Worker。先关闭 Worker 并等待两条日线完成，再启动 Worker，用临时行锁阻塞任务完成语句；实际确认目标已提交、任务仍为第一次 `CLAIMED` 后，SIGKILL 隔离 Platform，额外终止该条被阻塞的测试 PostgreSQL 会话，释放锁并重启 Platform，等待原 30 秒租约自然到期。

TestRun `897181fe-448f-4322-9d1e-a1ddb08ae622` 的同一任务第二次领取后 COMPLETED；崩溃前后目标 ID 一致且仅有一条，目标 PAUSED、无订单身份，订单/成交/预留/outbox 数量未增加。测试数据和进程均隔离，活动服务未连接，测试容器与网络已清理。该结果需要**应用进程与执行中数据库会话同时终止**这一明确条件，不表示仅杀死进程必然触发第二次领取。

此前尝试保留如下：首次目标未按时提交，故障点未建立，测试 FAIL；第二次已建立故障点，但只终止应用进程，阻塞的 PostgreSQL 完成语句在释放锁后仍可完成，实际 attempt 为 1，故原先要求 attempt 为 2 的断言 FAIL。另一次完整浏览器复验在进入新故障点前 FAIL：`v24-live-readiness.spec.ts` 页面显示 HTTP 502，等待 `v24-test-run-id` 超时；原因尚未定位。本次通过的定向复验跳过 Web，不覆盖或抵消该失败。报告的 `environment` 字符串误含 Chromium，实际 `browserScenarios` 为空且控制台 `webChecked=false`；后续报告生成已修正此描述。

本证据只覆盖隔离 Fixture 目标与任务，正式 Web 入口/同 Run 验收、浏览器 502 排查、Platform 创建各提交点崩溃、真实时钟连续链和20个合格交易日仍未完成；C5 为 PENDING，用户签收未执行。
