# V3.2 验证报告门禁切片（2026-09-26）

本轮新增 `V3.2IndependentValidationReport` 契约和量化服务纯函数门禁。报告必须逐项包含 PIT、样本外、成本、规则和容量五项结果；每项只能为 PASS/FAIL/NOT_RUN，PASS 必须附 SHA-256 证据。任一 FAIL 得到 `REJECTED`，无失败但有未运行项得到 `INCOMPLETE`，只有五项均 PASS 才得到 `ELIGIBLE_FOR_REVIEW`。输出绑定 PromotionRequest/TestRun，来源保留 FIXTURE/REAL_CANDIDATE，且 Registry mutation 常量为 `NOT_PERFORMED`。

验证：契约类型生成42 schemas成功；量化单测25/25（包含新门禁4项）；量化服务TypeScript构建通过。更新后完整 `pnpm verify:stage -- --stage V3.2 --suite code` 退出0：679 Markdown链接、79 JSON/43 schemas/28契约fixtures/30兼容规则、15个哈希Fixture、V3.2准备门禁4项、量化单测25项及候选登记/PromotionRequest两组隔离PG/HTTP smoke、研究自动化95项单测和构建、Web类型检查及1项单测通过。首次受沙箱 localhost 网络限制失败；权限审核后重跑通过，集成入口报告使用随机隔离测试库。Stage code suite仍明确输出 `businessValidation=NOT_RUN`、`registryMutation=NOT_PERFORMED`、`humanAcceptance=NOT_RUN`。

范围限制：这是报告结构与 fail-closed 汇总逻辑，不是独立数据/代码复算器。当前调用方尚未连接受控 Qlib 验证环境，PIT/OOS/成本/规则/容量证据均未由本轮生成；现有V3.2固定Fixture仍使用占位SHA，不能据此生成有效晋升报告。未新增HTTP路由、数据库状态迁移、Registry写入、批准或策略激活。V3.1前置、V3.2业务场景、Web和人工验收仍为 NOT_RUN。
