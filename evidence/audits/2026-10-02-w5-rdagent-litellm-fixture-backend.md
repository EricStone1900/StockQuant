# W5 RD-Agent LiteLLM Backend → Fixture/预算账本隔离集成

日期：2026-10-02（Asia/Shanghai）  
Research Automation 镜像：`sha256:05a45830f2c15a7643f60ec2f0aa3c4a7250ffd761dabb0d07dbc30d0057ef53`  
RD-Agent/LiteLLM Runner 镜像：`sha256:eb9030b8107c79c3554dabc68322814b81c04564bb0a1e5a9841bd603a67ccf1`

## 验证结果

扩展`pnpm v31:litellm-model-gateway-internal-smoke`，在随机 Docker `--internal` 网络、临时PostgreSQL及固定镜像中实例化锁定RD-Agent v0.8.0的`rdagent.oai.backend.litellm.LiteLLMAPIBackend`，实际调用其`build_messages_and_create_chat_completion`和`create_embedding`方法。测试内给LiteLLM transport注入确定性Fixture endpoint、临时Service Bearer、Experiment/ModelRun身份和预算绑定头；未改变生产服务入口或实际Provider配置。

两条请求均通过Research Automation OpenAI-compatible Fixture HTTP端点，得到固定Chat响应及2条Embedding向量。独立查询临时PostgreSQL确认两条ModelRun账本为`SETTLED`，申请/预留合计120 cents、Fixture费用合计46 cents；持久Provider usage为Chat输入/输出12/8 tokens、Embedding输入/输出8/0 tokens。Smoke退出0，报告`externalProviderCalls=0`。脚本`finally`清理后只读核查未发现`name=sq-litellm-`的容器或网络。

Research Automation build和lint通过；受控本机单测34文件/191项全通过。普通沙箱的3项代理测试因loopback监听EPERM失败，受控重跑通过。保留两个集成首次失败：其一RD-Agent默认将日志写到镜像只读工作目录，Smoke改用临时`/tmp`工作目录后重跑；其二旧断言假设RD-Agent Backend返回Token usage，修正为检查账本持久usage后通过。

## 范围与限制

这证明固定版本RD-Agent LiteLLM Backend可以经内部确定性Fixture响应，并把ModelRun身份、usage与Fixture结算写入独立预算账本；不是完整RD-Agent控制器/研究算法、真实Qlib研究实验、生产Provider适配器、账单对账或真实DNS/网络出口隔离。测试以注入测试transport和内部Fixture服务实现，无外部请求、无凭证、无活动服务接触、无Paper/券商操作。W5/V3.1真实业务与人工验收仍`NOT_RUN`；preflight继续BLOCKED，NO_TRADE及无数据源授权未改变。

完整运行计数及Run IDs见[JSON结果](./2026-10-02-w5-rdagent-litellm-fixture-backend.json)，SHA-256见同名Manifest。
