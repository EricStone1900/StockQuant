# W9 总门禁复核（V3.3 Runner与预算分页增量之后）

日期：2026-10-01。

V1/V2/V3的`pnpm verify:version -- --version V1/V2/V3`均为INCOMPLETE/exit 2。未完成阶段分别为V1.1、V2.3–V2.5、V3.1–V3.4；三版missingAcceptance与unexpectedAcceptance均0。V3.3工程代码通过不改变V3.1/V3.2前置或V3.3业务、人工验收状态。

版本证据链接校验均PASS：V1 16引用/1 Manifest，V2 103/10，V3 98/13；无缺失引用、无Hash错误。`pnpm baseline:check`和`git diff --check`通过；baseline覆盖1,439条Markdown链接、174 JSON、115 Schema、36 Fixture及生成客户端/兼容性检查。当前V3.3 `pnpm verify:stage -- --stage V3.3 --suite code`退出0，含Research 169单测/21 PG集成、Platform 102单测/3集成、Web 3/3、双轮次隔离Runner恢复及两种50,000行分页探针。预算摘要尾页offset P95 161.34ms，带cursor续页P95 3.36ms；首页精确汇总仍需全Run读取、约70.20ms P95。摘要深分页证据见[审计](2026-10-01-w7-v33-budget-summary-pagination.md)、[审计Manifest](2026-10-01-w7-v33-budget-summary-pagination.sha256)和[原始容量结果](2026-10-01-w7-v33-budget-summary-capacity.json)。

测试摘要明确`businessWorkflow=NOT_IMPLEMENTED`、`stageBudgetControl=NOT_IMPLEMENTED`、`paperContinuity=NOT_CHECKED`、businessValidation与humanAcceptance均NOT_RUN。NO_TRADE、无数据源授权、O1/O2与真实Ubuntu观察门禁及人工验收均不变。热缓存合成数据不证明生产容量、真实RD-Agent或业务结果。
