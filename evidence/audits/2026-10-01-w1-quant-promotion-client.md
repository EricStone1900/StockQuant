# W1 Quant Promotion Platform 客户端审计

- 日期：2026-10-01
- 范围：Platform→Quant Research V3.2 PromotionRequest详情/验证报告读取和精确版本决定，及V3.3准备态对PromotionRequest详情的只读投影。
- 实现：基于既有`quant-promotions.v1` OpenAPI生成`GeneratedQuantPromotionClient`，覆盖详情GET、独立验证报告GET、决策POST三个操作，复用规范类型、Platform Bearer/Service ID、5秒超时、URL编码及类型化HTTP错误。Client生成漂移检查已接入`contracts:check`与`contracts:generate`。
- 应用门禁：保留用户Session、owner范围、仅本人正常V3.1来源TestRun、V3.1精确人工接受记录、验证报告与TestRun绑定、报告指纹及明确决策确认。V3.3只读读取仍在创建准备态Run前校验owner来源。
- 验证：生成器`--check`通过；Platform typecheck及unit suite 134/134通过；完整V3.2及V3.3 code suite均退出0。V3.2包括全仓baseline、build/lint/typecheck/tests、Platform集成、隔离Linux/ARM64 readiness及Web构建/测试；V3.3包括Research Automation service Bearer/queue/budget smoke、TestRun budget摘要50k行隔离PostgreSQL容量探针、Runner Fixture故障恢复与原子预算门禁、Platform/Web构建和3/3 Playwright通过。完整套件明确`businessValidation=NOT_RUN`、V3.2 `activeRegistryMutation=NOT_PERFORMED`、V3.3 `modelProviderCalls=0`、`paperCalls=0`、`humanAcceptance=NOT_RUN`。
- 安全边界：本次未调用V3.2决策或业务研究路由；没有真实候选/数据源调用、没有Paper调用、没有活动Registry变化或活动服务触碰。真实业务验证及用户验收保持未完成。
