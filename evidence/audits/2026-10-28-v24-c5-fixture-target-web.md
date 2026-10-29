# V2.4 C5 隔离日线目标 Web 入口（2026-10-28）

V2.4 验收页新增“隔离日线目标任务”面板，可创建固定 Fixture 任务、刷新所有者最近任务列表、读取原任务状态和恢复原 Run。面板显示后台任务和暂停目标，明确任务完成不代表阶段验收通过；Worker 默认关闭，列表最多展示最近 50 个 Run。请求失败时可刷新列表查找原 Run，不能以盲目新建替代恢复。

Web typecheck、`git diff --check` 通过。命令 `node scripts/run-isolated-postgres-command.mjs --admin-env V24_PAPER_SMOKE_ADMIN_DATABASE_URL -- pnpm --filter @stockquant/platform-api-service v24:paper-http-smoke` 在隔离本地 PostgreSQL、真实服务进程、容器化 Web 和 Chromium 下退出 0；[完整报告](./2026-10-28-v24-paper-smoke-47b77fffec7a4e23a07ef86d10fa4396.json)、[浏览器记录](./2026-10-28-v24-paper-web-e2e-789189fb-2cf2-48b5-ac3b-8f620b5d1b60.json)。测试显式开启隔离 Worker；Web 创建 TestRun `f16981e6-90a8-4cfc-9b0e-f1b8aff2db33`，后台任务 COMPLETED、目标 `PAUSED/MANDATE_INACTIVE`，刷新页面、列表找回与重复恢复同 Run 通过；同 Run CLI `--check-only` 退出 2，阶段状态 WAITING。既有六个浏览器场景及各自 CLI、后台进程故障检查也通过；测试资源清理且未连接活动服务。

此记录不是 C5 人工验收或持续 Paper 验收：目标任务只覆盖固定合成输入与暂停目标，真实时钟链、活动授权、自动日终及20个合格交易日未完成；Platform 创建各提交点崩溃未逐点验证。先前 Web 502 本次未复现，但根因仍未确定。C5 保持 PENDING，用户签收 NOT_RUN。
