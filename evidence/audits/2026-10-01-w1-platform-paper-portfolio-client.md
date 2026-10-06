# W1 Platform → Portfolio Risk V2.4 账户初始化生成客户端

日期：2026-10-01（Asia/Shanghai）

V2.4 Paper Fixture normal/rejection流程先前在Platform直接POST Portfolio Risk账户初始化端点。现改用既有`portfolio-account.v1`生成客户端执行初始化，继续使用`platform-api-service`独立Bearer及固定schema；生成客户端负责HTTP(S) URL校验、Service ID、JSON和5秒超时。缺失快照/账户ID仍进入StageRun的失败处理，不静默置换账户。

Platform相关5项场景/客户端测试与typecheck通过。实现后V1.1完整code suite通过；计划中另要求的V2.4完整HTTP/PG/Chromium/CLI套件正在补跑，当前不能将其视为已通过。

本变更没有部署到活动服务，也没有启动数据采集或Paper调度；只在隔离Fixture/FakeBroker范围验证。NO_TRADE与无数据源授权保持有效。
