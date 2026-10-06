# W7 V3.3 隔离代码套件复验

时间：2026-10-03。命令 `node scripts/run-isolated-postgres-command.mjs --url-env RESEARCH_AUTOMATION_DATABASE_URL:research_automation:research_automation_test --url-env PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test -- pnpm verify:stage -- --stage V3.3 --suite code` 退出 0。Harness 为 Research Automation 与 Platform 提供一次性 PostgreSQL 数据库，测试完成后确认容器与网络删除；活动服务未连接。

全套覆盖 baseline、Research Automation 216/216 单元及 29/29 集成测试、Platform API 180/180 单元及 6/6 集成测试、实验绑定/认证拒绝/预算HTTP探针、Web typecheck 和 Playwright 3/3。研究队列与TestRun预算汇总测试报告模型调用0、Paper调用0。合成分页探针生成66,100项记录，覆盖100至50,000行；最深50,000行末页 offset p95 864.686 ms，cursor p95 237.180 ms。该热缓存隔离数据库微基准不代表生产容量。

Runner Host 两轮、1,000行固定Fixture恢复检查通过：第一Host检查点序号1持久化，模拟SIGKILL后过期租约由第二Host以fencing token 2接管并恢复游标2；旧fence发布409。容器限制500m CPU、512 MiB、32 PIDs，观测峰值约50.2 MB、49.93% CPU、4 PIDs。仅做确定性Fixture计算，无Provider请求。Harness报告临时容器和网络清理通过。

最终套件报告为 `businessWorkflow=NOT_IMPLEMENTED`、`dispatch=ISOLATED_FIXTURE_RUNNER_SMOKE_ONLY`、`paperContinuity=NOT_CHECKED`、`businessValidation=NOT_RUN`、`humanAcceptance=NOT_RUN`。这次通过仅证明当前隔离代码与固定场景检查；不代表正式研究业务闭环、真实RD-Agent/Provider、连续Paper、Ubuntu或用户验收完成。V3.3及版本验收保持未完成。
