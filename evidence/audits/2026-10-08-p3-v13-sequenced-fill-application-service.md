# V1.3 sequenced Fill 应用服务提取审计

日期：2026-10-08

## 变更

将固定 L07/L08 `sequenced-reports`、撤单请求及撤单结果路由中的 TestRun/Proposal/FakeBroker 范围校验、Fixture 报告构造、Run Clock 使用、Trade Execution 调用、Reservation时序断言与订单投影读取，提取至 Platform Application `V13SequencedFill` 流程。流程通过 StageRun、Governance Proposal、Portfolio、Trade Execution 和订单投影 ports 访问外部域。HTTP Controller 保留可信会话身份解析、client 适配和应用错误到 HTTP 状态映射。

事件契约及交易事实所有权没有改变；本次没有真实券商、外部行情访问，也没有改写活动业务Run。复核时发现原始刷新修复截图输出目录被 Harness 复用：旧SHA文件与当时内容失配。当前受影响文件留存为明确标注的历史快照；同一工作区的失配已由最新版本门禁确认不再列为活动manifest，不能恢复此前被覆盖的字节。此后修正Harness按隔离项目使用不同截图目录，并保留本轮全新42个截图/Trace文件和SHA清单。

## 验证

- Platform 定向新增7项应用服务用例；全套 Platform 单测 60 files / 268 tests 通过，typecheck 通过。
- `pnpm verify:stage -- --stage V1.3 --suite code` 受控重跑 exit 0。原始日志：[最新代码套件](./2026-10-08-p3-v13-order-coordination-application-services-code-suite.log)，SHA-256 `5fd56ba39a9453adf7dd8d68218cc9b3fd56f6d494224dbcb50701da86880251`。
- `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e:v13-isolated` exit 0，21/21；固定矩阵每个Run的CLI check-only/export均通过，external source calls=0、real broker calls=0，项目`sq-v13-web-c4cc70eba73b6aead7cf`容器/卷/网络清理为0。原始日志：[最新Web/API/CLI矩阵](./2026-10-08-p3-v13-order-coordination-application-services-e2e.log)，SHA-256 `5b7769a09036ce536ae72f36e844a525cfb367fcf64a9da83ca48790dada1b01`。本轮21张PNG与21条Trace保存在[独立运行目录](./2026-10-08-v13-browser-captures-order-coordination/)，SHA清单`dee4bfb549bc6463d34b2d6c5a6fa38f3069cc150141ce1cfeffc13acb9c4dd9`。
- 保留默认隔离权限失败记录：[早期代码套件尝试](./2026-10-08-p3-v13-sequenced-fill-application-service-code-suite.log)；[早期E2E尝试](./2026-10-08-p3-v13-sequenced-fill-application-service-e2e.log)。前者的锁定Python Worker镜像在默认上下文不可见，后者Docker socket被沙箱拒绝；二者分别在受控本机上下文使用已锁定镜像/精确Harness成功复验。

## 结论和边界

此应用层边界增量及固定 V1.3 回归通过。该结论不关闭P3全部工程/市场规则、V1版本门禁、用户人工验收、Ubuntu目标环境或其它P1–P6计划项；任何缺项继续按各自门禁记录。
