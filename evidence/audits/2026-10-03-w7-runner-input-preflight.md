# W7 Runner 输入派发前置校验

日期：2026-10-03（Asia/Shanghai）

## 结果

修复 Research Automation 持久化队列派发边界：通过 TestRun、Experiment、轮次和 RESERVED 预算绑定后，PostgreSQL 部署现在还会在 Runner Job 入队前验证输入 ArtifactRef 属于该 TestRun/Experiment 的 `inputs` namespace、已注册、类型为 `INPUT`、状态为 `PUBLISHED`、内容寻址一致，并读取实际字节核对长度与 SHA-256。拒绝未登记、未发布、跨 namespace、错误类型、哈希不匹配和超过 8 MiB 的输入；超限返回 413，其余无效引用返回 409。Memory-only smoke 未引入伪造 ArtifactRef，仍只测试隔离的非执行队列。

## 验证

- 新增 `v33-runner-input-preflight.spec.ts`：8/8通过，包含合法输入、未登记引用、namespace/kind/status/hash拒绝、8 MiB上限和实际字节差异拒绝。
- Research Automation TypeScript lint通过；完整Research单测38文件、215/215通过；PG集成29/29通过。
- 完整 `pnpm verify:stage -- --stage V3.3 --suite code` 退出0：合同与Fixture检查通过；66,100条合成实验分页探针通过；两轮隔离Fixture Runner SIGKILL/租约恢复通过；Platform单测169/169、集成6/6、Web typecheck及E2E 3/3通过。
- 第一次在受限沙箱运行因5项本机mock proxy测试不能绑定127.0.0.1（EPERM）失败，失败保留；授权后受控本机 loopback 重跑通过。没有外部Provider、市场数据、Broker或Paper调用。

## 限制与阶段状态

该修复是持久化派发入口的输入完整性检查，不实现V3.3正式业务工作流。V3.3套件状态仍为 `businessWorkflow=NOT_IMPLEMENTED`、`businessValidation=NOT_RUN`、`paperContinuity=NOT_CHECKED`、`humanAcceptance=NOT_RUN`；完整版本门禁、来源授权、NO_TRADE、Ubuntu实机与用户验收状态均不改变。没有新增长期观察天数。
