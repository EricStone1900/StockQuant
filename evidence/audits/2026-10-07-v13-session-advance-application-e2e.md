# V1.3 Session 推进应用服务抽取与回归

日期：2026-10-07（Asia/Shanghai）

## 变更

将 Session 推进用例的业务协调从 `V13AcceptanceController` 移至 Platform Application 层 `V13SessionAdvanceService`。应用服务通过 StageRun、Portfolio、独立 FakeBroker 资产、对账和市场日历端口进行校验，并用 `expectedClock` 持久化栅栏推进下一交易Session；HTTP 层保留身份验证和错误码映射。新增应用服务单元测试覆盖预留阻断、账本不一致阻断、成功推进、过期时钟幂等重放和跨阶段Run拒绝。

## 验证

- 定向应用服务单测：5/5；Platform API typecheck通过。
- `pnpm verify:stage -- --stage V1.3 --suite code`：受控loopback环境退出0；Platform 54个测试文件/232项通过，Quant Worker 14项通过，合同、Fixture、分层、构建、类型和工作区检查通过。
- `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e -- --stage V1.3`：退出0，Playwright 21/21；随机隔离项目 `sq-v13-web-d5c3c092365b5f9309ae` 的容器、卷、网络和镜像清理核验为空。21份TestRun证据均导出，`manualConclusion=NOT_RUN`。

逐Run UUID、证据SHA和原始日志见相邻JSON与LOG；源码Hash见SHA-256清单。此项只完成Session推进协调的应用层抽取和当前固定矩阵回归；proposal审批/下单等其它业务协调仍有部分留在HTTP层，P3及用户验收继续开放。

