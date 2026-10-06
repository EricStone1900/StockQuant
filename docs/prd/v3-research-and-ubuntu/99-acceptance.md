# V3 RD-Agent 自动研究与 Ubuntu 交付：验收清单

当前结论：NOT_RUN。这里只验收本轮模拟范围，不代表原R1真实账户、R2实盘或全部R3增强通过。

## 1. 阶段验收

| 阶段 | 后端/自动检查 | Web人工验收 | 证据/testRunId | 已知限制 | 签署/日期 |
|---|---|---|---|---|---|
| [V3.1 真实 RD-Agent 小样本实验闭环](./01-rdagent-small-experiments.md) | NOT_RUN（固定Fixture工程闭环与当前V3.1代码套件通过；2026-10-01 Research 177单测/25隔离PG集成、Platform 142单测、EXPIRED生命周期合同/owner读门禁与LiteLLM内部Fixture均通过；固定镜像完整code suite退出0，外部Provider调用0） | NOT_RUN | [准备证据](../../evidence-v3.1-preparation.md)；[P7.2 HTTP/PG](../../../evidence/audits/2026-09-25-p7-2-service-identity.md)；[P7.3 Runner](../../../evidence/audits/2026-09-25-p7-3-offline-runner-smoke.md)；[P7.4预检/账本](../../../evidence/audits/2026-09-25-p7-4-request-budget-ledger.md)；[P3.R Artifact授权](../../../evidence/audits/2026-09-25-p3-r-artifact-boundary.md)；[P7.5固定浏览器全链路与故障恢复](../../../evidence/audits/2026-09-25-p7-5-fixed-pipeline-smoke.md)；[W5 Docker上下文与V3.1回归](../../../evidence/audits/2026-10-01-w5-docker-context-v31-regression.md)；[W5离线完整回归](../../../evidence/audits/2026-10-01-w5-v31-offline-regression.md)；[W5固定镜像复验](../../../evidence/audits/2026-10-01-w5-v31-literal-fixture-regression.md)；[Artifact过期生命周期](../../../evidence/audits/2026-10-01-w1-artifact-expiry-lifecycle.md) | 生产研究容器仍未部署本次测试路由；真实 RD-Agent/模型调用、生产费用对账和Provider外发限制、过期策略/调度、物理Artifact清理、文件写入后事务崩溃孤儿回收及其余故障矩阵、Ubuntu实机未完成。网络拒绝证据限于本地 `--network none`；OOM/网络并发验证只是固定小样本，不是生产连续性/容量证据；`modelCalls=NOT_RUN`。固定Fixture测试不等于模型实验或候选有效性 | 人工验收未签署 |
| [V3.2 独立复算、人工批准与模拟策略晋升](./02-candidate-validation-and-promotion.md) | NOT_RUN（当前工作树完整 code suite PASS；随机隔离PG/HTTP中固定合成候选源码于受限ARM64容器执行，70/70信号经第二隔离容器独立重算并用于OOS交易；新增owner-scoped `READINESS_ONLY`准备态TestRun创建/同ID读取及可导出WAITING/NOT_RUN证据包，完整套件仍明确`businessValidation=NOT_RUN`） | NOT_RUN | [PromotionRequest intake及读路由复核](../../../evidence/audits/2026-09-25-v3-2-promotion-intake.md)；[验证报告持久化](../../../evidence/audits/2026-09-27-v32-validation-report-persistence.md)；[精确版本决策](../../../evidence/audits/2026-09-27-v32-exact-version-decision.md)；[Worker候选隔离执行](../../../evidence/audits/2026-09-27-v32-independent-worker-process.md)；[当前工作树code suite复验](../../../evidence/audits/2026-09-27-v32-code-suite-reverification.md)；[浏览器及场景复核](../../../evidence/audits/2026-09-27-v32-browser-scenario-recheck.md)；[准备态证据导出CLI](../../../evidence/audits/2026-09-27-v32-evidence-export.md)；[W6准备态TestRun基础](../../../evidence/audits/2026-09-30-w6-readiness-testrun.md)；[W6准备态TestRun Hash](../../../evidence/audits/2026-09-30-w6-readiness-testrun.sha256)；[W6 TestRun导出审计](../../../evidence/audits/2026-09-30-w6-readiness-run-export.md)；[W6 TestRun导出Hash](../../../evidence/audits/2026-09-30-w6-readiness-run-export.sha256) | 实验仅限精确白名单合成Fixture；非Fixture/用户候选执行与Qlib独立验证仍缺，V3.1权威前置、治理/Paper正式精确指纹消费、V3.2业务TestRun/正式证据包及人工验收缺失；准备态元数据不替代正式业务运行；无活动Registry/Mandate变更 | 待用户确认 |
| [V3.3 研究扩容、预算与持续运行](./03-research-scale-and-recovery.md) | NOT_RUN（2026-10-06 当前源码完整code suite PASS：Research 218单测/32 PG集成、Platform 200单测/8 PG集成、Web E2E 5/5；normal/recovery/rejection同TestRun业务断言PASS、Artifact独立Hash/Fixture验证及预算账本断言已通过；仅工程子项完成，Paper连续观察、其他阶段前置及人工验收仍未满足） | NOT_RUN |[最新normal业务证据](../../../evidence/local/V3.3/98054476-9b1c-4896-82f9-23de4e548505/evidence.json)；[最新recovery业务证据](../../../evidence/local/V3.3/df7779d0-3cc3-4bd6-b4af-a17b57d0b37d/evidence.json)；[最新rejection业务证据](../../../evidence/local/V3.3/d44eb74f-0bb5-46d1-a7c9-1a851c4ef236/evidence.json)；[页面能力边界修订审计](../../../evidence/audits/2026-10-06-w7-v33-web-capability-boundary.md)；[当前完整套件审计](../../../evidence/audits/2026-10-06-w7-v33-web-capability-boundary.json)；[来源与导出Hash清单（历史执行快照）](../../../evidence/audits/2026-10-06-w7-v33-web-capability-boundary.sha256)；[此前独立导出复核](../../../evidence/audits/2026-10-06-w7-v33-structured-run-evidence-export.md)；历史完整套件证据及各执行失败保留在下方记录 | 真实RD-Agent/用户模型候选、Paper连续运行、授权行情源和O1/O2观察、其他版本前置、Ubuntu实机交付及阶段业务全量验收仍未完成；NO_TRADE及数据源授权NONE保持，Fixture证据不证明真实模型或策略有效性；Web E2E为mock API浏览器覆盖，不替代真实Web到运行服务联测 | 人工验收未签署 |
| [V3.4 Ubuntu 迁移、全阶段 Web 回归与最终交付](./04-ubuntu-migration-and-release.md) | NOT_RUN（2026-10-02本地代码门禁及21项离线备份合同测试PASS；Ubuntu/业务E2E仍NOT_RUN） | NOT_RUN | [V3.4本地代码门禁复验](../../../evidence/audits/2026-10-02-w8-v34-code-suite-rerun.md)；[离线备份合同套件](../../../evidence/audits/2026-10-02-w8-backup-offline-contract-suite.md)；[SHA-256](../../../evidence/audits/2026-10-02-w8-backup-offline-contract-suite.sha256) | Ubuntu真实迁移/恢复、部署级备份和隔离恢复、RPO/RTO、业务工作流、全阶段E2E、5个实际交易日Paper观察未执行；不得以本地amd64容器仿真替代Ubuntu；用户验收未签署 | 待用户确认 |

## 2. 版本门禁

2026-10-02 V3.1 Backend Fixture增量：固定RD-Agent LiteLLM Backend经隔离Fixture写入两笔确定性预算/usage记录，范围与限制见[审计](../../../evidence/audits/2026-10-02-w5-rdagent-litellm-fixture-backend.md)。此工程证据不改变V3.1业务/人工`NOT_RUN`。

2026-09-23 状态复核：V3.1 已有研究 API、预算账本、Runner 镜像和受限宿主 Smoke 的准备范围证据，但不代表真实研究闭环。真实模型调用、Runner 服务接入、实际模型费用调用链、Provider 精确域名许可及 Ubuntu 实机仍未完成；OD-009 与用户人工验收保持未关闭，故 V3.1 和 V3 总结继续为 `NOT_RUN`。依据：[V3.1 准备证据](../../evidence-v3.1-preparation.md)。

- [ ] 每阶段第7节开发交付项已逐项核实；用户人工项有实际确认依据。
- [ ] 每阶段第8节由DRAFT_NOT_EXECUTABLE更新为实测手册，填写目录、URL、具体Fixture/参数、代码测试命令和预期输出。
- [ ] 正常/拒绝/恢复、代码套件、浏览器E2E、Web同run只读核对及证据导出均有实际命令/退出码；必需观察项未跳过。

- [ ] 所有必需阶段及成功/拒绝/恢复适用场景已通过，失败未被随机性掩盖。
- [ ] 正式页面与验收中心实际调用业务服务；长任务不依赖浏览器存活。
- [ ] FakeBroker独立状态、订单/Fill幂等、资金与可卖量、PIT及运行隔离通过。
- [ ] 数据、模型、券商、环境、成交模型分别标注；真实组件/外部服务与Fixture证据不混淆。
- [ ] 目标架构检查、性能/观察窗口按本版阶段要求记录，缺项仍NOT_RUN。
- [ ] 阶段脚本、日志、截图、数值检查、迁移/备份及操作说明齐备。
- [ ] LIVE写入口不可用，真实券商（含只读）未接入；本版仅模拟交付。

## 3. 运行证据模板

| 字段 | 内容 |
|---|---|
| 版本/阶段/场景版本/testRunId | 待填写 |
| market/account/namespace | 待填写 |
| environmentMode/dataMode/modelMode/brokerMode/executionModel | 待填写 |
| Commit或工作区快照Hash/镜像Digest/依赖锁Hash/迁移/契约 | 待填写 |
| 输入数据/股票池/日历/规则/成本/策略/Mandate/时钟 | 待填写 |
| seed/固定故障场景/实际注入事件序列 | 待填写 |
| Mac或Ubuntu/CPU架构/是否模拟架构/资源配额 | 待填写 |
| 命令/退出码/自动断言/Trace/截图/报告 | 待填写 |
| 实际结果/预期/容差/未覆盖与原因 | 待填写 |
| 人工验收人/UTC时间/结论 | 待填写；NOT_RUN/PASS/FAIL |

本版全部必需门禁PASS才可标PASS；部分完成用文字说明范围，总结不能覆盖子项FAIL/NOT_RUN。后续数据扩容或镜像/代码变化需新证据，不覆盖历史签署。

2026-10-02 工程复归记录：V3.1 Runner Host artifact publish 纳入生成OpenAPI客户端；固定镜像隔离 `pnpm verify:stage -- --stage V3.1 --suite code` 退出0（外部Provider调用0、活动服务未触碰）。这不是V3.1 normal/rejection/recovery业务验收或用户签署，阶段状态保持NOT_RUN。详情见[Runner Host Artifact客户端审计](../../../evidence/audits/2026-10-02-w1-runner-host-artifact-client.md)及[SHA-256](../../../evidence/audits/2026-10-02-w1-runner-host-artifact-client.sha256)。

2026-10-03 V3.1共享契约回归记录：W6新增Promotion preparation schema并重新生成跨服务TypeScript/Python contracts后，使用当前工作树固定镜像运行V3.1完整code suite退出0；Research 203/203 unit、28/28 PostgreSQL integration，Platform 166/166 unit通过。回归是Fixture/工程兼容性，`businessValidation`与人工验收仍`NOT_RUN`，不代表真实Provider/模型或阶段交付完成。见[W5/V3.1审计](../../../evidence/audits/2026-10-03-w5-v31-after-w6-contract-suite.md)、[机器结果](../../../evidence/audits/2026-10-03-w5-v31-after-w6-contract-suite.json)和[日志](../../../evidence/audits/2026-10-03-w5-v31-after-w6-contract-suite.log)。


2026-10-03 W7状态完成门禁工程切片：[Platform单测、PostgreSQL集成和当前V2.3共享源码复验](../../../evidence/audits/2026-10-03-w7-completion-evidence-guard.md)。不完整证据尝试标记COMPLETED会回滚并保留RUNNING；完整V3.3工作流、Paper连续性、自动业务验证与人工验收仍NOT_RUN，不更改本表任何签署结论。

2026-10-03当前代码套件复验：V3.3固定Fixture工程与Web自动检查已通过，但真实研究派发/业务工作流未实现、业务验收/连续Paper/人工签署仍NOT_RUN；阶段状态保留NOT_RUN。详见[当前W7复验](../../../evidence/audits/2026-10-03-w7-v33-current-suite-refresh.md)。

2026-10-03 V3.1当前工作树回归更新：Research镜像digest固定后完整code suite与内部Fixture调用通过（外部Provider为0）；权威业务运行及用户Gate未变化。V3.1阶段和人工验收仍NOT_RUN。详见[W5复验审计](../../../evidence/audits/2026-10-03-w5-v31-current-worktree-rerun.md)。

2026-10-03 V3.2当前code suite复验：隔离Platform/TestRun准备态持久与权限拒绝通过；TestRun `b5b03f66-6c6b-437e-982a-200d83f06f71`仍WAITING/READINESS_ONLY，活动Registry/Paper未触碰，故V3.2及人工验收状态仍NOT_RUN。详见[W6当前复验](../../../evidence/audits/2026-10-03-w6-v32-current-suite-refresh.md)。

2026-10-03 W5 V3.1离线Fixture code suite复验退出0；模型与Runner镜像Digest已核验，LiteLLM内部Fixture及预算路径报告外部Provider调用0，随机PostgreSQL容器已清理。该自动化不等于真实RD-Agent实验、供应商账单/出口策略验证或用户人工签署；V3.1保持NOT_RUN。详见[W5说明](../../../evidence/audits/2026-10-03-w5-v31-isolated-code-suite.md)、[机器结果](../../../evidence/audits/2026-10-03-w5-v31-isolated-code-suite.json)和[SHA](../../../evidence/audits/2026-10-03-w5-v31-isolated-code-suite.sha256)。

2026-10-03 W5 V3.1离线Fixture code suite复验退出0；模型与Runner镜像Digest已核验，LiteLLM内部Fixture及预算路径报告外部Provider调用0，随机PostgreSQL容器已清理。该自动化不等于真实RD-Agent实验、供应商账单/出口策略验证或用户人工签署；V3.1保持NOT_RUN。详见[W5隔离审计](../../../evidence/audits/2026-10-03-w5-v31-isolated-code-suite.md)。

2026-10-03 W6 V3.2准备态代码套件自动复验退出0；70项合成候选跨运行时独立重算、持久准备态/权限隔离及readiness TestRun重启回读通过，活动Registry未修改。TestRun `f6239ede-cc29-41cb-ae81-3545506e38a8`明确`WAITING`/`READINESS_ONLY`，Paper/真实候选执行/用户Gate均未触发。此自动证据不构成真实独立业务验证、精确版本批准、Ubuntu或用户签署；V3.2仍NOT_RUN。见[W6说明](../../../evidence/audits/2026-10-03-w6-v32-isolated-code-suite.md)、[JSON](../../../evidence/audits/2026-10-03-w6-v32-isolated-code-suite.json)和[SHA](../../../evidence/audits/2026-10-03-w6-v32-isolated-code-suite.sha256)。

2026-10-03 V3.3隔离代码套件完整自动复验通过，但只覆盖Fixture Runner恢复、只读队列/预算API、Web检查与合成容量探针；业务工作流未实现，连续Paper未检查、业务验收及用户签署仍NOT_RUN，故不改变V3.3状态。详见[W7审计](../../../evidence/audits/2026-10-03-w7-v33-isolated-code-suite.md)。
