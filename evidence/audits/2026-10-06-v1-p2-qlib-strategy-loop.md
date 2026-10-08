# V1.2 双市场 Qlib 策略闭环隔离复验

日期：2026-10-06。结果：隔离 Web/API/CLI E2E PASS；本记录不签署人工验收或正式阶段。

**执行范围：** 新随机 Compose 项目 `sq-v12-e2e-cfed4f354f335e110e07`，Vite 地址 `http://127.0.0.1:51474`。数据来自 `v1.2-market-data-4`（manifest SHA-256 `28b43c921efac9661ca6209911d9e98496ef311aa752b3ca00fec5cb70390688`），纯合成 FIXTURE；Market Data 外部来源授权/调用均为 0，FakeBroker/LIVE写/外部模型调用均为 0。

V1.2 normal TestRun `e0e6f0ca-f14b-489e-9103-e1d59d5e8237`通过 Web 创建；锁定 Qlib 0.9.6 / LightGBM 4.7.0 对 CN_A 和 US_EQUITY 分别执行一次真实 `LGBModel.fit/predict`。CN 输入 364 行（209/70/85），US 输入 111 行（63/21/27），两组时间泄漏检查均 PASS；测试集共 112 个预测，Artifact 中预测值包含多个不同值。标签定义为次日收盘收益；训练/验证和验证/测试之间各留一个日期并按标签实际可用时间过滤。独立Fixture校验记录 CN 209/70/85、US 63/21/27，另验证输入手算窗口和两道时间屏障。

策略输出保存了基于各市场测试段最后日期的每市场 Top-1 目标，以及空目标 `NO_TRADE` 基线。As-of 为 `2024-03-22`；A股目标 `000006.SZ/CNY`，美股目标 `AAPL/USD`。模型SHA、输入SHA、预测SHA、策略Hash及不可变Artifact均关联同一TestRun。Artifact ID/SHA-256：`3989d6021c251f4c9055430deac88004c6526d2711861214e3b1153f51ff7aa0`。浏览器读取Artifact并核验版本、Hash、112项预测、预测非恒值和双市场；CLI对相同Run使用`--check-only`退出0。

rejection TestRun `a78809c4-4a41-4ca7-8fee-0f7fdbe072f8`以`FUTURE_DATA`拒绝并通过同Run CLI；recovery-probe TestRun `79b05810-972f-49aa-b274-6e54c9f06d63`通过Qlib READY探针及同Run CLI。recovery-probe不注入Worker故障，不能证明任务中断恢复。测试输出为 Playwright 1/1 passed；三Run、断言和详细模型/Artifact证据见[机器报告](./2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-cfed4f354f335e110e07.json)。

临时平台、Market Data、Quant、Qlib Worker、PostgreSQL容器，PostgreSQL与Artifact命名卷、网络和本轮镜像已清理并核验。运行栈清理不保留本轮隔离数据库/Artifact字节；Hash与模型元数据保留在这份证据报告中。人工验收保持`NOT_CHANGED`。Qlib为本机Apple Silicon上的`linux/amd64`容器仿真；没有真实行情、策略收益、Ubuntu或真实交易结论。
