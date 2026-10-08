# V1 小数据本地模拟闭环：验收清单

当前结论：NOT_RUN。这里只验收本轮模拟范围，不代表原R1真实账户、R2实盘或全部R3增强通过。

2026-10-07 V1.4 CN_A费用子项自动对照新增：Quant与FakeBroker在相同锁版费率下BUY/SELL及滑点费用一致，专用隔离PostgreSQL对BUY/SELL/部分BUY/零成交拒绝的持久订单与Fill事实核验通过；详见[费用一致性审计](../../../evidence/audits/2026-10-07-v14-cn-a-fee-parity.md)。V1.4总体仍PARTIALLY_IMPLEMENTED，完整适用市场规则、费税、结算、Paper总账一致性、Ubuntu和本轮用户确认均未通过；未新增人工签署。

## 1. 阶段验收

| 阶段 | 后端/自动检查 | Web人工验收 | 证据/testRunId | 已知限制 | 签署/日期 |
|---|---|---|---|---|---|
| [V1.1 环境、账户初始化与 Web 验收中心](./01-environment-and-web-center.md) | PASS（自动验证） | PASS（用户确认） | normal `d5add8bf-ae44-48a8-b726-b4be34ab4278`（[恢复的原始TestRun证据包](../../../evidence/local/V1.1/d5add8bf-ae44-48a8-b726-b4be34ab4278/evidence.json)，manualConclusion仍NOT_RUN）；rejection `24276340-2e5a-4516-a7d0-20f92851754b`（[2026-10-05从legacy PostgreSQL精确行恢复](../../../evidence/local/V1.1/24276340-2e5a-4516-a7d0-20f92851754b/evidence.json)，无run级人工签署）；recovery `bdb53484-19b4-4363-a130-eee94761df54`（[2026-10-05从legacy PostgreSQL精确行恢复](../../../evidence/local/V1.1/bdb53484-19b4-4363-a130-eee94761df54/evidence.json)，无run级人工签署）；2026-09-26 stage-mode code suite及Web normal/rejection/recovery同run CLI见[审计](../../../evidence/audits/2026-09-26-v11-stage-store-code-suite.md) | 历史 2026-09-09 验收范围为本地 ARM64；当前统一TestRun存储模式代码和三场景Web/CLI在独立PG验证通过；2026-10-01 V1.1全代码套件受控退出0，包含DC-06项目分页/导出生成客户端漂移检查，Market Data分钟API八操作及账户客户端仍有效；新增Research Artifact不可变过期时间/EXPIRED终态有隔离PG、Platform投影与完整V3.1套件证据，但未批准保留期/调度或物理清理；DC-06分页/导出另有匿名401、跨项目403的真实隔离HTTP/PG证据；活动API仍为`legacy`且未执行切换/回退窗口；本轮未新增人工签署 | 用户确认（本会话） / 2026-09-09；历史签署保留，新增范围未签署 |
| [V1.2 小样本数据、真实 Qlib 与环境探针](./02-small-data-and-qlib.md) | PARTIALLY_IMPLEMENTED（历史范围保留；2026-10-07完整code suite及隔离Web/API/CLI回归通过；新增范围人工验收和Ubuntu未完成） | 历史用户确认PASS（2026-09-09）；新增范围人工验收NOT_RUN；Ubuntu NOT_RUN | `v1.2-market-data-4`；Qlib 0.9.6；历史平台Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`（结构化导出缺失，W9未恢复）；当前normal TestRun `890f3fab-e689-471b-8c45-97abd531d3d5`（[结构化证据包](../../../evidence/local/V1.2/890f3fab-e689-471b-8c45-97abd531d3d5/evidence.json)，3/3断言PASS、manualConclusion NOT_RUN）；2026-10-07完整`pnpm verify:stage -- --stage V1.2 --suite code`exit 0并含最新隔离Web/API/CLI 1/1，四个Run及输入Hash见[机器结果](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1dd2d38c42f2392cb0b4.json)和[历史执行快照SHA清单](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1dd2d38c42f2392cb0b4.sha256) | Qlib容器为Mac ARM64上的linux/amd64仿真；真实市场数据、全量数据、Ubuntu x86_64及新增范围人工验收仍未验证 | 用户历史确认保留 / 2026-09-09；本轮不新增签署 |
| [V1.3 治理、风控与模拟券商完整交易链路](./03-fake-broker-trading-loop.md) | PARTIALLY_IMPLEMENTED（历史范围保留；2026-10-08版本化Fixture/Schema/Web消费、修复刷新后订单恢复、Portfolio/Trade/Governance三处LIVE/REAL拒绝与无副作用断言通过、当前完整code suite exit 0、固定隔离Web/API/CLI矩阵21/21通过及逐项截图/Trace重新验证；尚未纳入锁版Fixture的故障边界、全路由安全清单、完整规则/目标Ubuntu交接和本轮人工验收未完成） | 历史用户Web确认PASS（2026-09-09）；新Fixture范围当前自动矩阵21/21 PASS；新增范围人工验收NOT_RUN | [V1.3 Fixture与交接审计](../../../evidence/audits/2026-10-08-p3-v13-fixture-and-handoff.md)；[Paper/Fake服务端边界代码套件](../../../evidence/audits/2026-10-08-p3-paper-fake-server-boundary.md)；[新Fixture绑定的完整矩阵](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)；[订单协调应用服务后的完整代码套件](../../../evidence/audits/2026-10-08-p3-v13-order-coordination-application-services-code-suite.log)；[订单协调应用服务后的21项Web/API/CLI矩阵](../../../evidence/audits/2026-10-08-p3-v13-order-coordination-application-services-e2e.log)；[应用服务提取后21项截图与Trace Hash清单](../../../evidence/audits/2026-10-08-v13-browser-captures-after-app-service.sha256)；[刷新修复轮历史执行快照Hash清单（Harness复用原目录后已失配）](../../../evidence/audits/2026-10-08-v13-browser-captures-refresh-fix.sha256)；[修订协调后最终审计](../../../evidence/audits/2026-10-07-v13-governance-coordination-after-revision.md)；[治理应用服务最终审计](../../../evidence/audits/2026-10-07-v13-governance-application-services.md)；[MANUAL执行应用服务审计](../../../evidence/audits/2026-10-07-v13-manual-execution-application-service.md)；[AUTO_POLICY应用服务审计](../../../evidence/audits/2026-10-07-v13-auto-execution-application-service.md)；[持久Session推进与T+1审计](../../../evidence/audits/2026-10-07-v13-tplus1-session-advance.md) | FakeBroker为隔离模拟，未接触真实券商；固定矩阵不是完整交易所规则、长期观察、Ubuntu或用户验收 |
| [V1.4 日线历史回测与可核对报告](./04-daily-backtest.md) | PARTIALLY_IMPLEMENTED（历史签署保留；2026-10-07固定回测/公司行动及持久异步任务隔离E2E通过，覆盖预执行取消、Quant调用前与Quant结果落库后Platform进程恢复、同ID幂等重放、Web轮询和同Run CLI；2026-10-07 V1.3 FakeBroker SELL修复后复跑V1.4完整code suite与隔离E2E通过；滑点后0.01报价档BUY/SELL对齐的规则切片已验证；费用模型/全市场规则/日历、Qlib/Paper完整对照、当前范围用户验收未完成） | `pnpm verify:stage -- --stage V1.4 --suite code` exit 0；`pnpm test:e2e -- --stage V1.4` exit 0，17组Quant BacktestRun/Manifest/resultHash配对、17个Platform TestRun、8个浏览器Run由CLI同Run核验、Playwright 5/5；当前滑点取整受影响的V1.3/V1.4 code suite均exit 0；人工结论NOT_RUN | [滑点报价档对照](../../../evidence/audits/2026-10-07-v14-slippage-tick-parity.md)、[最新持久任务复验](../../../evidence/audits/2026-10-07-v14-durable-tasks-ab5fb8f4ee92e8c60081.md)、[历史执行快照机器结果](../../../evidence/audits/2026-10-07-v14-durable-tasks-ab5fb8f4ee92e8c60081.json)、[历史执行快照输入SHA-256](../../../evidence/audits/2026-10-07-v14-durable-tasks-ab5fb8f4ee92e8c60081.sha256) | 完整适用市场规则/日历、费用税务、Qlib/Paper逐规则一致性和当前人工签署未完成；自动PASS不替代人工验收或V1.4关闭 | 历史人工签署仅适用当时范围；本轮新增范围未签署 |
| [V1.5 无人逐笔操作、故障恢复与 V1 验收](./05-scheduling-and-recovery.md) | PARTIALLY_IMPLEMENTED（normal NO_TRADE有原子Outbox→JetStream→Temporal纵切；Temporal服务/平台/网络/PG会话恢复、坏JSON/错误owner终止、丢ACK重投、瞬态NAK、Activity执行中Worker重启和双Worker独立consumer/Workflow启动幂等及单Worker进程故障接管均有隔离E2E；HOLD权威观察120项通过；PostgreSQL进程恢复及PostgreSQL/NATS/Temporal三卷配对恢复后同Run状态保留均通过。Platform 55文件/241项单测、Python Worker 14/14及当前stage code suite exit 0；交易/日终、拒绝/恢复业务仍未接线；宿主/异地恢复、Artifact卷、双Worker同时故障、UNKNOWN未验证，第2/7/8节待办未完成） | 历史用户Web与Ubuntu烟测确认PASS（2026-09-09）；当前W8目标主机明细/范围重验NOT_RUN；当前V1.5新增范围人工验收NOT_RUN | 历史业务Run `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`结构化导出缺失；本轮NO_TRADE及Web/API/CLI/export证据：[V1.5 NO_TRADE Temporal E2E](../../../evidence/audits/2026-10-07-v15-no-trade-workflow-e2e.md)、[坏消息/错误owner/重复派发与原Outbox恢复E2E](../../../evidence/audits/2026-10-07-v15-poison-envelope-e2e.md)、[双Worker E2E](../../../evidence/audits/2026-10-07-v15-multiworker-e2e.md)、[双Worker首次尝试失败记录](../../../evidence/audits/2026-10-07-v15-multiworker-first-attempt-failure.md)、[完整派发/重投审计](../../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)、[配对卷恢复E2E](../../../evidence/audits/2026-10-07-v15-paired-backup-restore-e2e.md)、[最终代码套件](../../../evidence/audits/2026-10-07-v15-final-recovery-code-suite.md)、[真实Temporal服务停机恢复](../../../evidence/audits/2026-10-07-v15-temporal-server-outage-e2e.md)、[受限网络恢复](../../../evidence/audits/2026-10-07-v15-network-outage-e2e.md)、[数据库边界重试](../../../evidence/audits/2026-10-07-v15-database-retry-e2e.md)、[PG会话恢复](../../../evidence/audits/2026-10-07-v15-database-connection-drop-e2e.md)、[PostgreSQL进程故障恢复](../../../evidence/audits/2026-10-07-v15-database-outage-e2e.md)、[单Worker故障切换](../../../evidence/audits/2026-10-07-v15-worker-failover-e2e.md)、[备份工具合同测试](../../../evidence/audits/2026-10-07-v1-p5-backup-tool-contract-tests.md)、[当前完整代码套件](../../../evidence/audits/2026-10-07-v15-postgres-process-recovery-code-suite.md)、[此前完整代码套件报告](../../../evidence/audits/2026-10-07-v15-code-suite-pinned-python-available.md)；其余：[7个历史Run恢复源审计](../../../evidence/audits/2026-10-07-v1-history-run-recovery-check.md) | 120个当地日期是虚拟Fixture观察，不是实际日历等待；rejection/recovery业务、宿主/异地恢复、Artifact卷、双Worker同时故障、UNKNOWN、交易/日终调度、目标Ubuntu和当前范围用户签署未完成。历史Run缺失证据未替代 | Ubuntu历史人工签署保留；本轮新增范围未签署 |

2026-10-07 V1.3最新隔离E2E补充：带一次性费用更正Outbox失败注入的正式隔离Web/API/CLI矩阵21/21浏览器用例通过，全部Run均有独立结构化导出；在此前L01-L10场景上新增持久版本化Fixture日历推进、同日SELL零副作用拒绝及下一交易日T+1 SELL双账核对。详见[本轮Session推进及T+1审计](../../../evidence/audits/2026-10-07-v13-tplus1-session-advance.md)和[此前20项矩阵审计](../../../evidence/audits/2026-10-07-v13-web-matrix-20-20.md)。所有新增Run人工验收仍NOT_RUN，V1.3继续PARTIALLY_IMPLEMENTED。

2026-10-07 V1.1存储切换前置补充：隔离PostgreSQL持久化/HTTP复验验证迁移幂等、历史记录保留、stage owner读取、双写及失败回滚；HTTP owner读取200、跨owner 403，容器/网络精确清理通过。日志与边界见[V1.1存储复验](../../../evidence/audits/2026-10-07-v11-storage-persistence-rerun.md)。活动数据库/API保持原样，切换仍NOT_AUTHORIZED/NOT_DEPLOYED；本条不新增人工验收或签署。

2026-10-07 V1.5 NO_TRADE Temporal normal切片：正式容器Web/API/CLI/export隔离E2E 1/1通过，TestRun `9e08dadd-c56f-422b-b7e6-aa3250b2d065`验证60个CN及60个US虚拟交易日、120条Portfolio/FakeBroker权威观测，`V1.5-HOLD-002` PASS；同Run CLI check-only按WAITING返回2，证据导出0。拒绝/恢复分别创建Run `b0e2f24e-1977-42c1-8d15-3fc381aa2eed`、`37619e69-5c30-4571-8ba9-8ea4f8c5ead1`，其业务事实如实NOT_CONNECTED/NOT_RUN，但CLI/export路径通过。隔离资源清理及零真实来源/券商调用通过。完整边界见[本轮机器审计](../../../evidence/audits/2026-10-07-v15-no-trade-workflow-e2e.json)；这不关闭V1.5拒绝/恢复、NATS事件驱动、双Worker、UNKNOWN、备份、Ubuntu、人工验收或历史缺失Run，V1门禁保持未完成。

## 2. 版本门禁

2026-09-23 状态复核：V1.1～V1.5 的阶段级历史自动验证和人工签署继续保留；阶段五已补充当前 Compose NATS/Temporal 持久卷容器重建 PASS。但版本级门禁清单仍有待逐项完成，且原始 Ubuntu 明细尚缺，因此版本总结维持 `NOT_RUN`，不改变用户既有签署。

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

2026-10-07 V1.5真实Temporal服务停机增量：Run `0871ddc3-9e7b-4669-b9c4-03a3182ecd31`在Temporal服务停止时创建，观察到真实派发失败/NAK；同一Temporal容器/持久卷恢复后，Run完成120项权威观察，normal/rejection/recovery Web、同Run CLI/export和隔离资源清理通过。证据：[停机恢复审计](../../../evidence/audits/2026-10-07-v15-temporal-server-outage-e2e.md)。此子项自动验证通过，不表示当前范围人工验收；数据库、网络、多Worker、备份、Ubuntu和历史Run缺口继续阻挡版本闭环。

2026-10-07 V1.5受限网络恢复子场景自动验证：Platform容器隔离网络断开3秒/恢复后同一Run完成120项；外部数据源/真实券商调用0，Web/CLI/export与资源清理通过。见[网络中断审计](../../../evidence/audits/2026-10-07-v15-network-outage-e2e.md)。此增量不替代双Worker、备份、目标Ubuntu及当前范围人工签署。

2026-10-07 V1.5数据库边界重试自动子场景：确定性仓储边界错误经JetStream NAK/同序号redelivery后同一Run完成120项；Web、同Run CLI/export、资源清理通过。证据：[数据库边界重试审计](../../../evidence/audits/2026-10-07-v15-database-retry-e2e.md)。PostgreSQL真实进程故障恢复及本轮人工验收仍未通过/签署。

2026-10-07 V1.5数据库边界错误后当前完整code suite：`pnpm verify:stage -- --stage V1.5 --suite code` exit 0；Platform 55文件/241测试、Python Worker 14/14及合同、Fixture、构建和服务测试均通过。日志与机器清单：[报告](../../../evidence/audits/2026-10-07-v15-database-retry-code-suite.md)。此门禁不代表真实PostgreSQL进程中断恢复或人工验收完成。

2026-10-07 V1.5 PostgreSQL会话恢复自动子场景：终止3个隔离Platform专属后端会话后，Platform建立新数据库会话，原Run完成120条权威观察；容器化Web、同Run CLI/export、项目清理通过。证据：[PG会话恢复审计](../../../evidence/audits/2026-10-07-v15-database-connection-drop-e2e.md)。这是当时的PG后端会话故障子场景；后续PostgreSQL进程停机/恢复已单独通过（见本节后续记录），主机/卷灾难恢复和新增范围人工验收仍未完成。

2026-10-07 V1.5 Platform PG会话恢复后code suite：完整`pnpm verify:stage -- --stage V1.5 --suite code` exit 0，Platform 55文件/241测试、Python Worker 14/14。报告和源码哈希见[重试/恢复后代码套件审计](../../../evidence/audits/2026-10-07-v15-database-recovery-code-suite.md)。

2026-10-07 V1.5双Worker dispatch幂等：两个独立Platform durable consumers都ACK同一normal TestRun，Temporal稳定Workflow ID重复启动按幂等路径收敛，120项NO_TRADE观察完成；browser normal/rejection/recovery、同Run CLI/export及隔离清理通过。报告：[E2E摘要](../../../evidence/audits/2026-10-07-v15-multiworker-e2e.md)、[机器记录及源码Hash](../../../evidence/audits/2026-10-07-v15-multiworker-e2e.json)。首次Harness尝试失败单独保留，详见[失败记录](../../../evidence/audits/2026-10-07-v15-multiworker-first-attempt-failure.md)。多Worker变更后当前完整V1.5 code suite exit 0（[日志和源码Hash](../../../evidence/audits/2026-10-07-v15-multiworker-current-code-suite.md)）。本次新增人工验收未执行；双Worker故障切换、交易/日终、UNKNOWN、备份恢复及目标Ubuntu仍未完成。


2026-10-07 V1.5 PostgreSQL进程中断恢复补验：隔离Harness终止PostgreSQL进程后重启同一容器/卷，同一JetStream序号被NAK并重投，原normal TestRun完成120项权威观察；normal/rejection/recovery浏览器路径、同Run CLI/export与精确清理通过。机器证据和13项源码SHA见[数据库进程故障审计](../../../evidence/audits/2026-10-07-v15-database-outage-e2e.md)。这不是宿主/卷灾备或备份恢复，不改变交易/日终、UNKNOWN、备份、目标Ubuntu及当前范围人工验收未完成的结论。首次尝试失败记录：[故障恢复首轮记录](../../../evidence/audits/2026-10-07-v15-database-outage-first-attempt-failure.md)。

2026-10-07 V1.5单Worker故障切换：独立durable主/备用Worker同时收到normal Run后，仅终止隔离主Platform/API容器；备用Worker启动该Run的Temporal Activity并ACK原JetStream序号，主API恢复后原Run完成120条权威观察。normal/rejection/recovery Web矩阵、同Run CLI/export、随机资源清理通过；外部来源和真实券商调用0。完整时序见[单Worker故障切换审计](../../../evidence/audits/2026-10-07-v15-worker-failover-e2e.md)。这是安全NO_TRADE切片，不代表UNKNOWN、真实交易/日终Workflow、双Worker同时故障、主机恢复、Ubuntu或当前范围人工验收。
