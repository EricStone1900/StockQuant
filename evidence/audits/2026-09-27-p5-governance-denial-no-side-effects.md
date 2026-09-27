# P5 治理拒绝先于 FakeBroker 持久化（2026-09-27）

在专用`trade_execution_test` PostgreSQL及真实临时 Governance/Trade Execution HTTP进程中扩展服务身份 smoke：

- 缺Bearer、错Bearer、未知服务、Platform调用仅限历史回放Worker的执行路由、Replay Worker越权撤单均403；Governance调用数保持0，表明路由scope先于下游授权核验。
- 使用有效`historical-replay-worker`身份提交命令，stub Governance按测试决策拒绝授权；Trade Execution返回403。按精确namespace查询FakeBroker四类持久事实：Order、Fill、Order Event、Outbox均为0，证明治理拒绝发生在FakeBroker事务写入前。
- 随后同进程切换隔离stub的授权结果为允许，正常经过Governance后发起固定零成交量命令，返回可审计`REJECTED/ZERO_VOLUME`；Governance调用方Bearer/Service ID核对正确，未生成Fill。

完整Trade Execution `pnpm test:integration`退出0：指纹幂等持久烟测、身份/治理拒绝HTTP smoke、P5.7 Portfolio提交后丢响应及服务重启恢复均通过。P5.7独立恢复TestRun `fd0664de-b540-44ca-a4df-5688c587d1d8`的一次Fill入账、UNKNOWN剩余预留保留及精确账本核对通过。Trade Execution 7文件/42单测、lint/build亦通过。测试用随机namespace并由脚本按namespace清理；未触及活动Paper、真实券商或模型。

边界：这是历史FakeBroker执行端的治理拒绝顺序和零副作用证据，不实现V2.4 SNAPSHOT→正式Mandate/风险/资源预留→Paper下单链，也不证明账户授权、活动部署或人工验收。OD-007相关策略/风险配置仍UNSET。

## V2.4 完整代码套件回归（2026-09-27）

随后执行`pnpm verify:stage -- --stage V2.4 --suite code`，在获准的本机隔离PG/HTTP环境退出0。构建、lint、typecheck、全仓单测、契约/Fixture校验通过；Trade Execution集成再次打印治理拒绝HTTP smoke（403，Order/Fill/Event/Outbox均0），P5.7 FakeBroker→Portfolio丢响应/执行服务重启恢复通过，Portfolio专用PG 3项及资源预留Bearer smoke通过，Market Data专用PG 22项及分区/分页HTTP smoke通过。Suite无人工Paper TestRun；V2.4场景仍`WAITING`，dataMode `NOT_CONNECTED`、执行政策/Mandate `PREPARATION_ONLY`，订单/Fill为空，对账`NOT_RUN`，Paper20日及人工验收不变。完整代码回归不把P5.5标记完成。
