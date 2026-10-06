# W7 V3.3 TestRun 预算汇总只读切片

日期：2026-10-01  
阶段：W7 / V3.3 研究扩容与隔离  
结论：代码切片 PASS；V3.3 阶段预算控制仍 NOT_IMPLEMENTED，阶段业务/人工验收仍 NOT_RUN。

## 实现范围

- 增加版本化 `v3.3-test-run-budget-summary-v1` 契约和 Research Queue `GET /v1/runner/budgets/test-run` 操作。平台通过 owner-scoped `GET /runs/:testRunId/research/budget/summary` 读取，先校验用户拥有对应 V3.3 TestRun，再以平台服务身份请求 Research Automation；Runner 身份不能访问该聚合端点。
- PostgreSQL 查询按 TestRun 聚合其全部已绑定 Experiment，而非当前 Runner 队列页。支持 1–100 条分页，返回请求/预留/结算/UNKNOWN 预留、轮数、状态及模型调用尝试数。UNKNOWN 资源保留计入，不被误报为可用余额；同一实验的实验级与模型调用级 UNKNOWN 使用较大值计入，避免漏记或双计。
- Web 的两个 V3.3 队列视图展示 TestRun 全局只读摘要和分页实验行，并显式显示 `stageBudgetControl=NOT_IMPLEMENTED`。这是完整 TestRun 账本读取，不是预算限额、轮次分配、模型执行或 Paper 控制。
- 集成测试和 HTTP smoke 仅使用随机 TestRun、专用 `research_automation_test` 数据库与 FakeBroker；不访问 Runner、模型供应商或 Paper，不触碰活动账本。smoke 最终清理由精确 TestRun ID 限定。

## 验证证据

完整命令 `pnpm verify:stage -- --stage V3.3 --suite code` 退出 0。关键输出：

- baseline/contracts：Markdown 1,394 链接无失败；115 schemas、36 fixtures、97 compatibility rules 和 V3.3 21 个 OpenAPI 操作通过。
- Research Automation：lint；31 个单测文件 / 169 tests；4 个 PostgreSQL 集成文件 / 21 tests；TestRun 汇总 HTTP smoke PASS（2 experiments、跨页唯一、requested/reserved 200 cents、settled 40 cents、UNKNOWN 15 cents、2 model calls；anonymous 401、Runner 403、非法查询 422；外部模型调用 0、Paper 调用 0）。
- Platform API：typecheck；27 个单测文件 / 101 tests；3 个集成文件 / 3 tests。
- Web：typecheck；V3.3 Playwright 3/3 PASS。
- 阶段套件报告保留真实边界：`businessWorkflow=NOT_IMPLEMENTED`、`stageBudgetControl=NOT_IMPLEMENTED`、`paperContinuity=NOT_CHECKED`、`businessValidation=NOT_RUN`、`humanAcceptance=NOT_RUN`。

## 仍未完成

此切片没有实现由 TestRun/阶段限额驱动的原子预算预留、round allocation、Runner 派发和执行、重试/恢复及检查点、真实研究/Provider 费用核对，亦未验证多租户生产规模容量或 Paper 并行隔离。因此不满足 W7 退出条件，不批准策略、不改变候选状态，也不改变 NO_TRADE、无数据源授权、O1/O2观察或人工接受状态。

文件 SHA-256 见同目录 `2026-10-01-w7-v33-testrun-budget-summary.sha256`。
