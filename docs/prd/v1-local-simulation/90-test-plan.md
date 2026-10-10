# V1 小数据本地模拟闭环：测试计划

执行[总体测试](../90-test-plan.md)中本版适用的模拟子项及[共同规则](../05-three-version-delivery.md)。初始状态全部NOT_RUN；本文件不会创建可运行脚本。

## 1. 阶段测试映射

| 阶段 | 自动检查 | 人工操作 |
|---|---|---|
| V1.1 | 真数据库初始化/重启/幂等集成测试、生成契约检查、浏览器初始化与证据持久化E2E；Platform→Trade Execution外部FakeBroker订单观察操作的路由/身份/请求合同见[§8.33](./01-environment-and-web-center.md#833-platformtrade-execution外部fakebroker订单观察客户端合同2026-10-10)。 | [阶段验收步骤](./01-environment-and-web-center.md) |
| V1.2 | 真实Qlib CPU烟测、PIT与手算因子测试、Artifact原子发布/取消集成、数据与策略浏览器E2E；Platform→Governance策略快照生成客户端合同及漂移检查见阶段§8.45；V1.2 TestRun客户端交易模式注入四组合HTTP拒绝及零TestRun副作用见阶段§8.33。 | [阶段验收步骤](./02-small-data-and-qlib.md) |
| V1.3 | 领域金额/状态机、真实DB并发占用和事务、真事件幂等、FakeBroker API契约、两市场人工/自动授权Web E2E；外部订单观察及Trade→Governance Proposal读取/授权创建/校验生成客户端合同与完整V1.3代码回归见[§8.77–§8.78](./03-fake-broker-trading-loop.md#878-trade→decision-governance-v13授权客户端操作合同2026-10-10)。 | [阶段验收步骤](./03-fake-broker-trading-loop.md) |
| V1.4 | 无未来泄漏、费用/结算/公司行动手算、相同输入复跑、Quant落库前后Platform强制重启恢复、取消/幂等重放、日线与Paper规则一致性及回测浏览器E2E；固定CN_A费率计划的Quant/FakeBroker BUY/SELL、55bps滑点、部分成交、持久Fill Outbox及授权REJECTED/EXPIRED终态释放Portfolio预留已在隔离数据库验证；Web拒绝路径明确显示未来信号与T+1拒绝、不发布报告并同Run CLI核对，刷新恢复同一TestRun；当前Playwright 7/7、10个浏览器Run同Run CLI通过，完整V1.4 code suite exit 0（§8.74–§8.76）。费用/结算全规则一致性仍未通过，详见[费率同规则对照审计](../../../evidence/audits/2026-10-07-v14-cn-a-fee-parity.md)、[终态预留释放完整代码套件](../../../evidence/audits/2026-10-10-v14-terminal-reservation-release-code-suite-a04.log)、[Web拒绝E2E](../../../evidence/audits/2026-10-10-v14-web-rejection-e2e-a01.log)及[当前code suite](../../../evidence/audits/2026-10-10-v14-trade-replay-governance-client-contract-code-suite-a01.log)。Trade→Governance Historical Replay授权客户端新增直接传输合同测试，受控完整套件通过，详见[§8.76](./04-daily-backtest.md#876-tradegovernance-historical-replay授权验证客户端合同2026-10-10)。 | [阶段验收步骤](./04-daily-backtest.md) |
| V1.5 | 真数据库/总线/Temporal进程恢复E2E、浏览器关闭与重连、双Worker、备份恢复及V1全阶段回归；Platform TestRun创建拒绝四种客户端模式注入且持久Run数不变见[§8.28](./05-scheduling-and-recovery.md#828-v15-testrun创建拒绝客户端交易模式注入2026-10-10)。当前树全服务数据库/角色、合成跨库交易事实、V1.2 Qlib及V1.4 Quant回测报告配对恢复见[§8.40–§8.42](./05-scheduling-and-recovery.md#842-v14-quant回测结果manifest与platform-testrun报告配对恢复2026-10-10)；浏览器刷新恢复同一TestRun及Activity期间Platform API PID 1崩溃自动重启在四场景Web/API/CLI/export隔离E2E通过，见[§8.43](./05-scheduling-and-recovery.md#843-页面刷新与platform-api进程崩溃恢复2026-10-10)。保留栈Platform API容器已恢复，既有normal Run的check-only仍按WAITING/NOT_RUN退出2，见[§8.44](./05-scheduling-and-recovery.md#844-保留v15栈platform-api恢复与同run只读核查2026-10-10)。仍需真实服务产物、同点完整NATS/Temporal、活动/目标主机、RPO/RTO验证。 | [阶段验收步骤](./05-scheduling-and-recovery.md) |

## 2. 共同测试流程

2026-10-10 V1.4 Paper固定市场限制子场景：`pnpm verify:stage -- --stage V1.4 --suite code`完整隔离套件通过；Trade Paper HTTP以冻结`market_restrictions_synthetic.csv`（SHA-256 `45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a`）验证SUSPENDED和LOCKED_AT_UPPER_LIMIT拒单、治理载荷绑定、相同请求重放以及Portfolio预留释放；Trade领域测试覆盖LOCKED_AT_LOWER_LIMIT SELL及可成交bar。证据：[V1.4 §8.77](./04-daily-backtest.md#877-冻结市场限制fixture贯通trade-paper拒绝路径2026-10-10)、[完整套件日志](../../../evidence/audits/2026-10-10-v14-market-restrictions-paper-code-suite-a03.log)及[SHA-256](../../../evidence/audits/2026-10-10-v14-market-restrictions-paper-code-suite-a03.log.sha256)。契约变更后V1.4 Web/API/CLI Playwright 7/7、10个Web Run同Run CLI及精确资源清理通过（[E2E日志](../../../evidence/audits/2026-10-10-v14-market-restrictions-paper-web-e2e-a01.log)）；该E2E只验证现有页面兼容。冻结锁跌停SELL另使用版本化两日Fixture，先建立真实29股持仓，再创建后续日SELL Reservation并贯通Governance→Trade Paper HTTP拒单；重放同单后Reservation释放、Portfolio/FakeBroker账本不变。完整套件a05 exit 0见[日志](../../../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.log)及[SHA-256](../../../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.log.sha256)。固定可卖持仓拒绝子项通过；完整规则、结算和阶段验收仍NOT_RUN/OPEN。

每阶段文件第7节为可勾选交付待办、第8节为验收操作手册。当前手册状态按各阶段第8节的执行记录校准：V1.1为VERIFIED_EXECUTABLE（§8.1仅限隔离栈/Fixture操作）；V1.2为VERIFIED_EXECUTABLE（§8.1仅限隔离Fixture/SIMULATION_ONLY）；V1.3为VERIFIED_EXECUTABLE（§8.1仅限Mac ARM64隔离操作）；V1.4为VERIFIED_EXECUTABLE；V1.5为PARTIALLY_VERIFIED_EXECUTABLE。未验证步骤仍是待办；此状态只说明相应操作指引已有实测范围，不代表业务断言全部通过、用户已验收、Ubuntu已验证或阶段通过。阶段实际状态与未覆盖范围以各自第8节及99验收表为准。

命令参数遵守共同规则第10节：normal/rejection/recovery与Web共享场景；code套件调用真实代码检查；check-only核对同一Web运行且不发起业务动作。保留预期异常的原业务状态，断言验证成功才退出0。人工确认不能由脚本生成。

1. 选择冻结的scenarioVersion、Fixture/DataVersion、市场、模拟账户、seed及目标环境，创建独立testRunId。
2. 执行正常场景，先检查真实后端事实与数值，再在正式页面查看；记录所用替身和外部实际来源。
3. 执行阶段规定的拒绝/异常场景，比较失败原因及副作用次数；需要恢复的场景核对订单、资源和账本。
4. 重复提交和刷新/关闭页面；验证幂等、后台继续、证据持久化以及跨运行隔离。
5. 运行Web自动E2E及适用Domain/DB/契约/事件测试。领域计算不能只依赖浏览器截图验证。
6. 人工核对页面可理解性和证据，填写版本验收；挂起、取消、缺依赖和未跑均不能自动变PASS。

## 3. 精度与证据

金额、数量、费用舍入、预算计数、唯一性按冻结规则精确验证；研究浮点按预设绝对/相对容差。研究排序并列时采用稳定次序，记录由数值差异造成的候选变化。原始Artifact Hash与规范结果Hash分开，运行ID、日志时间不能混入跨运行相等断言。

每个用例记录testRunId/业务ID/Trace、真实或Fake依赖、命令退出码、检查输出与浏览器截图。先实现共同规则列出的命令入口再执行，不存在命令必须报失败，不能空脚本返回0。
