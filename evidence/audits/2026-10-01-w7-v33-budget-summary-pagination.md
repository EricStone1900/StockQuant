# W7 V3.3 TestRun 预算汇总深分页优化与容量复核

日期：2026-10-01。状态：实现与隔离容量探针 PASS；V3.3业务验收仍 NOT_RUN。

发现：`snapshotForTestRun`的全TestRun汇总行分页使用`OFFSET`。即使增加TestRun/创建时间/实验UUID复合索引，50,000行尾页计划仍会Hash Join全TestRun实验和预算、扫描/排序50,000行。并且每个续页都会重复聚合整笔TestRun总额。

变更：新增部分索引`research_experiments_test_run_created_idx(test_run_id,created_at,experiment_id)`；预算摘要在已有offset兼容路径之外增加时间戳（微秒精度）+实验UUID的keyset cursor。首页计算并返回精确TestRun总额；cursor续页返回`totals: null`，避免重复扫描全Run。Web单独翻预算摘要页并缓存首页总额；Research Automation与Platform均验证TestRun范围、cursor/offset互斥和游标边界。旧offset入口仍兼容，深页可能慢。

隔离容量探针只在`research_automation_test`运行，按每Run 100、1,000、5,000、10,000、50,000行写入合计66,100条合成Experiment及预算记录。每档测首/中/尾页各10次，校验游标行与offset对应页严格一致，并记录`EXPLAIN ANALYZE BUFFERS`；精确删除Experiment、预算行及临时stage limit并确认清理。50,000行典型结果：

| 位置 | offset响应P95 / DB页查询 | offset计划 | keyset响应P95 / DB页查询 | keyset计划 |
|---|---:|---|---:|---|
| 首页（精确总额） | 70.20 ms / 0.311 ms | 复合索引，100行页 | 70.87 ms / 0.487 ms | 复合索引，100行页 |
| 中页（offset 24,950） | 139.56 ms / 52.407 ms | 50,000行Seq Scan + Hash Join + Sort | 2.917 ms / 0.498 ms | 复合索引100行 + 预算主键查找 |
| 尾页（offset 49,900） | 161.34 ms / 55.160 ms | 50,000行Seq Scan + Hash Join + Sort | 3.360 ms / 0.474 ms | 复合索引100行 + 预算主键查找 |

offset响应每页都重复计算总额；cursor续页明确不返回总额，因此首页与续页响应不是同一计算范围。首页合计P95约70ms；这些均为本机热缓存PostgreSQL微基准，不代表生产容量。各请求分别读取当前账本状态，不提供跨页的事务快照。实际Runner并发、模型费用、Paper负载、CPU/RSS/磁盘、持续运行及Ubuntu仍未测试。

V3.3完整`pnpm verify:stage -- --stage V3.3 --suite code`退出0：Research 169单测/21 PostgreSQL集成，Platform 102单测/3集成，Web typecheck与3/3 Playwright通过；含预算摘要HTTP cursor恢复、两个分页容量探针及双轮次Runner恢复。模型/Paper/订单外部调用0。报告仍明确`businessWorkflow=NOT_IMPLEMENTED`、`stageBudgetControl=NOT_IMPLEMENTED`、`paperContinuity=NOT_CHECKED`、业务与人工验收NOT_RUN。

机器原始结果（含计划摘要及所有规模/页位）见[JSON](2026-10-01-w7-v33-budget-summary-capacity.json)及[SHA-256清单](2026-10-01-w7-v33-budget-summary-capacity.sha256)。该报告本身的SHA-256见[审计Manifest](2026-10-01-w7-v33-budget-summary-pagination.sha256)。
