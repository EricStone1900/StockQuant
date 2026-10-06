# W2 Paper 新链拒绝与恢复矩阵盘点

盘点日期：2026-09-30。状态：IN_PROGRESS（P-F05仍有已列明的行为缺口；不得将冻结Fixture限制用于关闭计划要求）。范围为计划W2的V2.4 Fixture/Paper/FakeBroker新链，以及可复用的Portfolio与Trade Execution域不变量。此表记录已有证据范围和缺项；单测不替代跨服务/持久化证据，NOT_RUN不推断为PASS。

## 现有证据映射

| 编号 | 当前可复用证据 | 未覆盖或仍需确认 | 状态 |
|---|---|---|---|
| P-R01 陈旧/错误/时窗快照 | Trade HTTP对错证券/市场、陈旧、下单前、未来入库、窗口外六种变更真实返回422/409，拒绝前账本/预留/订单/Fill/Outbox均为0；`snapshot-execution.spec.ts`使用同一固定候选序列验证跳过下单前/错证券样本并选择首个合格样本 | V2.4单次执行命令只接收一份已绑定授权的快照，不存在服务端自由选择实时多源行情的命令；真实行情选源属W3/O2，仍禁止把Fixture证据外推 | PASS（固定契约范围） |
| P-R02 授权失效/精确版本 | 治理服务现提供契约化`POST /internal/v1/paper-authorizations/revoke`，仅平台独立Bearer可撤销同owner namespace/account范围内尚未消费的grant；原因与时间持久化。真实HTTP验证错误服务/错误Bearer→403、错namespace→404、成功撤销→REVOKED、相同原因重放幂等200、异因重放409、被撤销grant在Trade消费→403且业务事实不变；已消费grant撤销→409。8种owner/TestRun/account/Mandate/策略/费用/clientOrderId指纹篡改均403；未消费过期授权→403；有效期内已消费并返回成功的验证结果跨过expiry延迟交付后，真实V2.4 Fill仍完成且账本/outbox精确。结果见Smoke字段`revokedAuthorizationEvidence`、`consumedAuthorizationRevokeEvidence`、`authorizedFillAfterExpiryEvidence`。 | P-R02规定的有效期、撤销、精确scope和已授权成交继续处理均有隔离证据；限制是当前仅冻结V2.4 Fixture/CN_A/BUY路径，活动Paper与真实来源前置仍由W3/O2另行门禁 | PASS（隔离V2.4 Fixture授权生命周期） |
| P-R03 资金/可卖量/风险 | Portfolio隔离HTTP/PG证明两个6000元竞争10000元仅一个成功，UNKNOWN继续占用且权威取消后才释放；PG集成覆盖卖出可用数量并发争用、卖出部分Fill后预留递减、超额/错误scope拒绝；V2.4快照风险偏离验证另由P-R01、P-R04的业务前置断言覆盖 | 账户`ledgerVersion`是读取结果，不是当前预留命令的乐观锁输入；写路径以账户行锁下的最新余额/持仓串行判定，陈旧版本拒绝不适用。V2.4只开放CN_A BUY Fixture；US由就绪API明确REJECTED，真实交易与SELL Paper政策未授权，保持关闭 | PASS（已定义资金/数量语义；未开放市场保持fail-closed） |
| P-R04 身份/LIVE/跨scope | Governance/Trade Bearer边界、伪造service-id、匿名用户、跨owner/run/account/Mandate/策略/费用/clientOrderId以及LIVE配置均经隔离HTTP验证在业务写入前拒绝，所有业务计数不变 | 更广版本有效期/撤销由P-R02单独验证 | PASS |
| P-R05 幂等 | V2.4真实PostgreSQL并发相同载荷只创建1 order/1 fill/2 events/1 outbox；连接重开后重放返回原订单；同键改价格409；同授权改`clientOrderId`返回403且零副作用；Portfolio重复Fill/预留、异载荷冲突已有PG集成证据 | 新`clientOrderId`代表新业务命令，不能在未定义业务信号唯一键/策略额度时一概折叠为重复；当前授权明确绑定原`clientOrderId`，任何改键重放被拒。更高层信号去重属于新业务契约 | PASS（精确授权与当前幂等键契约） |
| P-F01 接受已持久化/响应丢失/查询未知 | 隔离API与Chromium均真实丢弃Trade接受响应。再注入原单GET 503后，TestRun保留FAILED；同Run恢复端点再次遇查询503时返回UNKNOWN、`executionResent=false`、业务计数不变并记录历史。查询可用后同Run按原namespace/clientOrderId读回相同FILLED订单，完成原Run；Web提供同Run恢复按钮，CLI `--check-only`返回0；执行请求仍只有一次 | 当前冻结V2.4 Fixture交易同步完成；未完成单的UNKNOWN与资源占用由接口fail-closed分支证明，未注入“Outbox待投递且平台恢复”的组合时序，由P-F03覆盖Outbox独立恢复 | PASS（响应丢失后的同Run查询/恢复） |
| P-F02 重复/乱序/迟到/部分Fill | Portfolio PG集成覆盖精确重复Fill、冲突载荷、部分BUY/SELL、预留上限；p5.7真实HTTP在Portfolio提交后丢响应并重启Trade，Outbox重投只记一个部分Fill；V2.4使用一次性完整快照Fill并覆盖幂等 | 当前V2.4与历史FakeBroker命令均以一个具名Fill事件为原子输入，没有累计数量更新或多Fill序号协议；乱序/迟到多Fill属于未定义协议，不伪造输入。若需求新增，需先版本化累计/增量语义和唯一键 | PASS（已定义协议；未定义的多Fill扩展不适用） |
| P-F03 Portfolio提交后超时/Outbox重投 | p5.7与V2.4临时PostgreSQL HTTP证据覆盖两层：Portfolio真实提交Fill后代理丢响应，Trade保持`LEDGER_PENDING`/Outbox `PENDING`、reservation `HELD`；重启Portfolio后现金/账本仍在，再重启Trade重放持久Outbox，订单`FILLED`、reservation `CAPTURED`，Portfolio/FakeBroker事实不增加。旧p5.7部分Fill另覆盖重复Outbox、lease takeover及旧token fencing | 当前Fixture Fill为一次性完整Fill；服务级重复投递已覆盖，主机/数据库介质恢复由W8负责 | PASS（幂等提交、Outbox和服务重启） |
| P-F04 持久状态重启 | Trade在FakeBroker事实持久化后真实重启并按原命令重放；V2.4响应丢失/UNKNOWN期间重启Trade后仍按原ID找回同订单；Portfolio在Fill事务提交、响应被丢弃后真实重启，现金8995及两条账本仍在；随后重启Trade重放持久Outbox，订单FILLED、预留CAPTURED，Portfolio/FakeBroker事实计数不变。既有p5.7覆盖Outbox待投递期间Trade重启、lease接管和旧token fencing | 测试覆盖服务进程崩溃恢复和持久数据；宿主机/数据库介质故障恢复属于W8备份演练 | PASS（服务级持久恢复） |
| P-F05 撤单/部分成交/费用更正/模拟外部订单 | 2026-10-02隔离PG验证部分Fill撤单请求幂等，平台Bearer模拟接受后写`CANCELLED`并创建耐久reservation解决Outbox，拒绝后恢复`PARTIALLY_FILLED`；Fill未投账时释放Outbox不会被claim，Fill投账确认后同事务排队；Portfolio PG集成验证部分BUY已捕获2010后`CANCELLED`只释放余量并可重新预留5980。撤单接受/拒绝竞争仅一结果提交；Portfolio独立版本化费用更正1→2→1与HTTP身份/现金/账本测试通过 | 尚未覆盖Fill与撤单按Broker权威序号乱序交错及跨服务端到端故障注入；Trade尚无持久FakeBroker费用修订Outbox；FakeBroker尚无独立外部委托注入。真实Broker明确禁止不等于FakeBroker计划场景已完成 | PARTIAL（撤单请求/结果、释放编排与Portfolio更正接收端各有证据；成交因果竞态、跨服务费用更正和模拟外部订单仍NOT_RUN；详见[2026-10-02隔离审计](2026-10-02-w2-fakebroker-partial-cancel-idempotency.md)及[Portfolio费用更正审计](2026-10-02-w2-portfolio-fee-correction.md)） |

2026-10-02并发撤单结果补充：同一部分成交订单并发提交接受与拒绝结果时，隔离PostgreSQL测试确认仓储生产路径仅提交一个权威结果，另一结果被忽略，事件恰一条且待入账Fill的Reservation不提前释放。见[审计的并发结果补充](2026-10-02-w2-fakebroker-partial-cancel-idempotency.md#2026-10-02-补充并发权威撤单结果)。该项收窄了“两个撤单回报竞争”边界；成交回报与撤单回报按权威Broker事件顺序交错、费用更正和独立外部单仍NOT_RUN，因此总行状态仍PARTIAL。
| P-F06 并发Run/重复调度/迟到事件 | 隔离Platform HTTP同时提交两个同seed V2.4 Run，均完成并有独立账户、订单、Fill、账本；同TestRun恢复及授权撤销生命周期分别经过持久状态/顺序验证 | V2.4 scheduler当前只提供观察采样；默认策略和Mandate为PREPARATION_ONLY，调度不会执行Paper订单，故重复交易调度/策略迟到Fill没有获准事件源。启用策略前必须先通过W3决策与门禁，再补运行期重复/迟到策略信号场景 | PASS（当前隔离Run范围；活动调度交易明确不适用） |

2026-10-02 W2交叉Smoke隔离加强复验：测试包`test:p5-7`此前默认连接正在运行的`stockquant-v12-postgres-1:5433`专用测试数据库；为严格保护活动集群，入口已改为拒绝5433，只接受由测试Harness创建并Docker Inspect验证的随机端口临时容器。当前隔离PG persistence与Trade→Portfolio HTTP/PG Smoke均PASS，TestRun `aa03498b-03b7-4d67-8fca-7ba5ee70e65d`，覆盖撤单请求期间的累计Fill增量、接受撤单、等待全部Fill Outbox后释放预留、费用更正和独立外部FakeBroker差异；容器/网络已清理，activeServices=NOT_CONNECTED。复验见[W2隔离P5.7审计](2026-10-02-w2-isolated-p57-harness.md)。这是实际顺序路径，不提供broker事件序号；同一Fill与撤单结果同时/乱序交错仍未证明，故P-F05仍PARTIAL、W2仍IN_PROGRESS。

另：V2.4当前真实交易Fixture范围只支持CN_A，US_EQUITY由Governance拒绝；W2应保持美国真实Paper NOT_RUN，不将V1/V2.1双市场Fixture当成V2.4市场规则证据。BUY完整主链已有W1；适用SELL业务/费用/交易单位规则必须从权威契约核对，不得默认把当前Fixture费用推广为真实费率。

## W2执行与退出检查（P-F05未关闭）

1. [x] 增加隔离服务HTTP Bearer与LIVE拒绝探针，证明返回拒绝前数据库业务计数不变（P-R04子项，2026-09-30 smoke PASS；结果见[全栈报告](2026-09-30-v24-paper-smoke.json)）。
2. [x] 为Trade Execution V2.4持久适配器补临时真实PostgreSQL幂等探针，覆盖并发同载荷重放、异载荷409、连接重开及唯一业务事实（Smoke退出0，报告字段`tradeExecutionSnapshotIdempotency`）。
3. [x] 补充P-F01同TestRun UNKNOWN/原ID续查、P-F04在Portfolio提交后重启与UNKNOWN期间Trade重启、P-F05完整Fill在LEDGER_PENDING期间拒绝撤单的最小可复现用例（全栈Smoke PASS）。
4. [x] 运行三服务单测/类型、Portfolio PG集成、隔离HTTP/Chromium/同Run CLI与`pnpm verify:stage -- --stage V2.4 --suite code`；故障顺序、断言、seed、退出码、四库导出Hash和清理写入全栈审计。最终阶段套件退出0；其余未定义/未授权能力均有明确不适用理由及后续门禁。

2026-09-30增量：W2全栈Smoke PASS，报告见[2026-09-30 V2.4 Paper烟测](2026-09-30-v24-paper-smoke.json)。新增`scopeTamperReject`覆盖八种精确授权指纹篡改，`expiredAuthorizationReject`覆盖到期授权；`tradeRestartEvidence`记录Smoke在FakeBroker快照命令并发/冲突检查后停止并重启本轮Trade进程，确认持久重放。另见该报告中的`lookupUnavailableRecovery`、`resourceConcurrencyEvidence`、`concurrentRunEvidence`、`outboxRestartEvidence`和四库逐表快照清单/Hash。新增`v24-paper-execution.spec.ts`场景后Trade Execution单测49/49 PASS。三服务单测与类型检查、Portfolio PG集成、Chromium及同Run CLI、文档/契约/Fixture检查通过；`pnpm verify:stage -- --stage V2.4 --suite code`退出0（需要本地loopback测试权限）。W2历史回归按当时冻结场景通过，但全计划退出尚未满足；P-F05缺口继续绑定后续实现，不以真实Broker禁用代替FakeBroker模拟场景。

所有测试数据库使用新唯一namespace/账户，清理仅删除本轮明确创建的资源；不得触碰活动V2容器、正式采集数据库或共享卷。


2026-09-30授权到期时序增量：修复原探针造成的数据库行锁争用，改为在隔离Smoke中的Governance响应代理处暂扣已成功的授权验证响应。临时治理库显示授权在`expires_at`之前已转为`CONSUMED`；将`expires_at`设为过去后再释放200响应，Trade仍完成，FakeBroker订单为FILLED、Portfolio Fill增加1、Outbox为DELIVERED，四库事实增量断言通过。复跑全栈API/Chromium/同Run CLI及数据库快照导出，报告状态PASS，字段`authorizedFillAfterExpiryEvidence.governanceConsumedWhileValid`与`successfulValidationResponseDeliveredAfterExpiry`记录时序。该时序不代表过期后授权验证可以通过；撤销路由已另行实现并验证，完整边界见本矩阵P-R02。

2026-10-02 P-F05隔离PostgreSQL复核：撤单写入现在先锁定FakeBroker order，再将`CANCEL_REQUESTED`状态和事件同事务提交；重复请求只返回现状态、不把重试误当作接受回报。随机隔离容器上部分Fill→并发cancel→断开重连读原clientOrderId通过，保留原成交和Outbox；未做撤单接受/拒绝回报、真实竞态、reservation部分解决、费用修订或模拟外部委托。命令与结果、第一次脚本cwd失败和首次发现终态重放丢Fill的失败证据见[本轮审计](2026-10-02-w2-fakebroker-partial-cancel-idempotency.md)。据此P-F05及W2保持未完成。
