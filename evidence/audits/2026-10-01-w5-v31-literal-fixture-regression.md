# W5 V3.1 完整代码回归复验

日期：2026-10-01（Asia/Shanghai）

固定Research Automation镜像为`sha256:4cb517d99727cab1f5001f53dcc11aa0cf2d42ad5ce564e685d5dbc28796a730`。`STOCKQUANT_RESEARCH_IMAGE_ID`显式固定该digest后，完整命令`pnpm verify:stage -- --stage V3.1 --suite code`退出0。

验证覆盖合同与生成器、Research Automation lint/build、31个单测文件/173项、4个PostgreSQL集成文件/23项、66,100行V3.3只读队列分页探针、固定模型网关Fixture smoke、固定RD-Agent/LiteLLM运行镜像上的内部HTTP chat/embedding smoke、Platform类型检查和42个单测文件/139项、owner-scoped Artifact HTTP/导出权限路径、Web类型检查。LiteLLM内部smoke以Docker internal-only网络运行，chat和embedding预算行均SETTLED；确定响应与向量、费用汇总断言通过。镜像、固定Fixture、`externalProviderCalls=0`及测试资源清理由smoke确认。

同轮基线复核：`pnpm baseline:check`退出0（Markdown链接1736条；211 JSON、146 schemas、36 Fixtures；合同生成、OpenAPI及Fixture检查通过）。V1/V2/V3证据引用检查均PASS，分别为28/131/113条引用、2/17/19个Manifest、3/18/19条条目；无缺失或哈希错误。版本门禁仍按当前未完成事实返回INCOMPLETE/exit 2：V1未决V1.1；V2未决V2.3–V2.5；V3未决V3.1–V3.4；Acceptance ID缺失/意外均为0。

该证据仅覆盖隔离Fixture和工程代码。真实模型Provider调用、账单对账、生产出口/DNS强制、真实RD-Agent业务闭环与人工验收均未运行。`STOCKQUANT_MODEL_PROVIDER_CALLS_AUTHORIZED=false`、`NO_TRADE`及无数据源授权继续有效；此回归未触碰活动服务或真实市场/券商。
