# W7 V3.3 当前代码套件复验

时间：2026-10-03。执行 `pnpm verify:stage -- --stage V3.3 --suite code`；当前完整隔离代码套件最终报告 `PASS`。

覆盖基线/合同/Fixture、Research Automation及Platform代码检查、隔离PostgreSQL集成、50k预算汇总页微基准、固定Fixture Runner两轮任务和进程杀死后租约接管/围栏、Platform TestRun查询、Web typecheck及V3.3 Playwright 3/3。Runner小样本为1,000行、2轮；模拟宿主SIGKILL后过期租约接管成功、fencingToken=2，输出Artifact哈希稳定返回；研究Runner约束为500m CPU、512 MiB内存、32 PIDs，实测峰值内存35,368,468 bytes、峰值CPU 34.18%、PIDs 3。预算查询容量探针仅为合成热缓存读性能验证，非生产吞吐。

最终suite报告明确：`businessWorkflow=NOT_IMPLEMENTED`、`dispatch=ISOLATED_FIXTURE_RUNNER_SMOKE_ONLY`、`modelProviderCalls=0`、`paperContinuity=NOT_CHECKED`、`businessValidation=NOT_RUN`、`humanAcceptance=NOT_RUN`。阶段状态仍`NOT_RUN`。无真实Model Provider、行情或Paper执行调用；不得将固定Fixture恢复探针解释为生产容量或业务验收。
