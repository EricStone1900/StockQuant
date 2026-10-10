# A22：V1.4 Historical Replay 服务证据与 V2.3 Platform 客户端范围校准

日期：2026-10-10。目的：纠正A06中将Platform `GeneratedHistoricalReplayClient`归为V1.4生产调用的记录，保留V1.4阶段明确要求的Replay Worker历史执行服务验证，同时避免将V2.3 Platform消费路径计入V1调用覆盖。

源码核查结果：

- `V14AcceptanceController`位于`api/v1/acceptance/v1/v1.4`，创建V1.4 TestRun时只装配`GeneratedQuantV14BacktestClient`与`V14QuantBacktestAdapter`。该V1.4 Web API没有调用`GeneratedHistoricalReplayClient`。
- `GeneratedHistoricalReplayClient.startHistoricalMultiBarReplay`的唯一生产调用位于`V23AcceptanceController`（`api/v1/acceptance/v2/v2.3`）；该调用写入的业务事实`stageId`为`V2.3`。V2.3 Worker状态读取和pause/resume/cancel也由同一控制器发起。
- `GeneratedHistoricalReplayClient.startHistoricalReplay`和`recoverHistoricalReplayUnknownOrder`在非测试生产源码中均无调用点。保留其合同代码和测试，但不把它们计为V1生产consumer。
- V1.4阶段文件本身要求Replay lifecycle伪造业务body拒绝、UNKNOWN按namespace读取、历史FakeBroker授权/执行/Portfolio账本服务验证；当前这些服务级HTTP/PG证据仍作为V1.4阶段验证记录，不能扩大解释为正式V1.4 Web已接通Replay Worker。

范围结论：A06将V1.4 Platform→Replay Worker行改为V1.4日线回测/历史FakeBroker服务验证，并增加明确的V2.3-only Platform→Replay Worker行；V1.4 Worker→Trade/Portfolio/Governance客户端仍是本阶段服务边，保留其精确测试映射。对V1.1-S2-L14交叉索引仅移除两条针对Platform `GeneratedHistoricalReplayClient`方法的V1精确测试映射及其V1.4客户端套件证据。所有V1 P1/P3父项、正式UI接线/验收及版本状态仍按各自证据判断。

依据：[V1.4 Platform控制器装配](../../services/platform-api-service/src/bootstrap/app.module.ts)、[V2.3 Platform生产调用](../../services/platform-api-service/src/bootstrap/app.module.ts)、[GeneratedHistoricalReplayClient直接测试](../../services/platform-api-service/tests/unit/historical-replay-client.spec.ts)、[V1.4阶段Replay要求](../../docs/prd/v1-local-simulation/04-daily-backtest.md#820-v14-unknown原单读取按replay-namespace隔离2026-10-10)、[校正后的主调用矩阵](./2026-10-10-v1-cross-service-route-matrix-a06.md)。

此静态范围校准不新增测试通过结论，也不关闭V1.4 Replay服务的阶段要求或任何正式V1验收条件。
