# W6 Quant 分层续验与 V3.2 完整代码回归

日期：2026-10-02。

复核发现 2026-10-02 PromotionRequest 分层审计中“验证报告、决策和详情 SQL 仍在 bootstrap”的结尾已被后续工作取代。当前 Quant bootstrap 已组合 `ValidationReportService`、`PromotionReadService`、`PromotionDecisionService` 及各自 PostgreSQL adapter；`pnpm service:layers -- --service quant-research-service` 禁止 bootstrap 直接访问 PostgreSQL。此前审计保留为历史记录，本记录补充当前复核。

首次执行完整 V3.2 套件时，Platform PostgreSQL 集成发现 V2.3 Artifact 生命周期测试把到期时间固定写为 `2026-10-02T00:00:00Z`。测试运行时该值已到期，故合法 EXPIRED 转换不应被拒绝。测试现基于运行时创建未来24小时到期值，随后仍将其改为过去值验证到期迁移；生产规则未改动。首次失败记录保留于执行输出。

验证：

- `pnpm baseline:check`：通过，文档链接2642项、合同Schema/Fixture/生成器及分层检查通过。
- `pnpm verify:stage -- --stage V3.2 --suite code`：受控loopback权限重跑退出0；包含隔离候选与参考执行容器、随机 PostgreSQL PromotionRequest/报告/决策集成、Research Automation 196项单测、Platform 162项单测及4个集成文件5项、容器化READINESS_ONLY重启/owner边界 smoke、Web typecheck/build/unit。
- 容器 smoke TestRun：`718ff583-9280-4e0e-9a02-d0a092bc781d`；`WAITING`、`sourceMode=READINESS_ONLY`、`businessValidation=NOT_RUN`，owner读200/匿名401/跨owner403，Platform重启后同ID读取200。

边界：合成候选及临时数据库；活动Registry未修改，Paper调用0，市场数据/外部模型/provider调用0，人工验收NOT_RUN。此结果只证明当前自动代码/隔离路径通过，不是V3.2业务验收；真实V3.1前置、正式候选业务TestRun与导出、精确版本批准消费、Web业务闭环、用户签署、Ubuntu仍未完成。
