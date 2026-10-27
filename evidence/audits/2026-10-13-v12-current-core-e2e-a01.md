# V1.2当前树主要功能E2E（2026-10-13）

执行 `pnpm test:e2e -- --stage V1.2`，隔离Linux容器实际启动Qlib 0.9.6、Platform、Quant、Market Data、Governance、PostgreSQL和Web。normal/rejection/recovery-probe场景及Platform容器重启恢复通过；四个Run均同Run CLI核对并结构化导出，TestRun UUID：`13b02776-2bb9-4c78-914f-6fd5729a0aea`、`fbd49b17-d7e4-4e17-b59c-3d0d19c7f0f6`、`cf26de93-16f0-4cde-8c9d-5f5e8095f8e4`、`00d77369-2c65-44b0-80b1-1fe57407440d`。

双市场Qlib真实fit/predict：CN_A输入347行、85项测试预测；US_EQUITY输入111行、27项测试预测；总计112项预测。产物含两市场Top-1建议和空目标NO_TRADE快照，持久送达Governance，未产生交易授权或订单。Qlib版本0.9.6，Fixture `v1.2-market-data-5`，bars SHA-256 `28b43c921efac9661ca6209911d9e98496ef311aa752b3ca00fec5cb70390688`。真实模型有效性/收益能力仍NOT_RUN；策略输出是研究建议，不因本测试启用活动交易。

Platform实际重启后同Run恢复并完成，Artifact Hash核对。E2E 1/1、浏览器核心场景通过；隔离PostgreSQL/Artifact卷/网络清理验证成功；外部行情/券商调用0。自动化Run `manualConclusion=NOT_RUN`。

原始机器报告：`2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-403a392144aecc40f6eb.json`（Harness文件名沿用旧日期）；其SHA-256 `127b89964558390b8b2e141324a69ea736428863eec78325263579cda8583d0d`。完整输入Hash清单见同目录 `.sha256`。
