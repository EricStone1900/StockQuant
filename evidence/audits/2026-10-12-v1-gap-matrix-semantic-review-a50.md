# V1.3-S2-L16 多种子Web/API/CLI复核 A50

日期：2026-10-12。范围只覆盖V1.3 L16的三种seed、三个固定成交/撤单到达顺序，不审阅其余146项需求。

## 复核结果

核对阶段第2节当前L16来源、对应Playwright声明、定向和完整隔离运行日志，以及TestRun证据导出与同Run CLI检查。原seed `20260907`覆盖seq=1部分Fill→撤单请求→seq=3撤单结果先到缓冲→seq=2 Fill补齐；新seed `20261013`覆盖seq=2先缓冲→seq=1排空→撤单请求→seq=3；新seed `20261014`覆盖seq=1→seq=2→撤单请求→seq=3。后两种顺序使用独立TestRun `54d3fa63-9958-4dee-95bd-7fb0c1481225`、`4227466c-08d0-48cf-b869-8750297de068`，都由正式Web页发起交易、API提交撤单，并由同Run CLI `--check-only`核对。

三个场景均断言成交因果序号、CANCELLED终态、150股持仓、CNY 8495.0000 FakeBroker现金、RELEASED预留和MATCH对账。两个新增seed定向Playwright 2/2通过；当前完整隔离V1.3 Web/API/CLI/Evidence Export矩阵36/36通过，真实券商和外部数据源调用为0，随机资源清理通过。当前自动Run的`manualConclusion`仍为`NOT_RUN`。证据见[完整E2E](./2026-10-12-v13-l16-multiseed-full-e2e-a01.log)、[定向E2E](./2026-10-12-v13-l16-multiseed-e2e-a02.log)、[阶段§8.98](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md#898-v13-l16-多种子webapicli因果成交与撤单-2026-10-12)。

## 分类与边界

该证据把“同Run Web/API/CLI多seed”从未覆盖推进到有三种seed/顺序的固定覆盖，但只验证这三种确定输入。V1.3-S2-L16仍`PARTIAL/OPEN`：24个PostgreSQL seed尚未逐一经Web路径执行；拒绝撤单、不同故障组合、完整CN/US市场状态矩阵、服务/宿主中断和Ubuntu仍未覆盖。不得把聚合36/36解释为L16或V1通过。差异矩阵A106只更新L16，本矩阵其余行仍继承A105，需单独语义复核。
