# W5 Provider usage ledger

日期：2026-09-30。范围：为未来真实Provider账单核对增加最小、可持久化的usage追踪元数据；未启用或调用真实Provider。

模型调用账本新增可选`provider_evidence` JSONB字段，并在初始化时对已有表执行幂等的`ADD COLUMN IF NOT EXISTS`。字段只允许Provider/model标识、Provider请求追踪ID、输入/输出Token计数、费率版本、费用依据（`FIXTURE`、`ESTIMATE`或`PROVIDER_REPORTED`）以及固定的`invoiceReconciliation=NOT_PERFORMED`。不记录API密钥、提示词、请求正文或原始Provider响应。

证据只能在请求已持久化为`DISPATCHED`或`UNKNOWN`后关联；重复完全相同的usage元数据幂等，修改已记录证据会拒绝。网关先持久化追踪信息再结算。Provider调用后若写证据或结算失败，调用仍保持`UNKNOWN`并占用完整预留，不会自动重试。`UNKNOWN`情况下可追加原调用的追踪证据，但这不等于完成账单对账；生产启用前仍须以供应商账单核实实际费用。

后续W5进展：增加固定DeepSeek Chat与SiliconFlow Embeddings HTTPS适配器，分别实现固定model/endpoint、禁止redirect、输入/响应大小与结构校验、超时、错误正文脱敏以及版本化usage费用估算。调用均由注入的Fixture `fetch`执行，无外网访问。网关现将非Fixture费用结果标为`COMPLETED_UNRECONCILED`，把Provider输出交给调用者并将模型调用账本保留UNKNOWN/全额reserved；估算不再写成已结算费用，重复modelRun不会再次调用。官方契约核对：[DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)与[价格页](https://api-docs.deepseek.com/quick_start/pricing/)，[SiliconFlow embeddings](https://api-docs.siliconflow.cn/docs/api/embeddings-post)。

验证：最新`pnpm verify:stage -- --stage V3.1 --suite code`退出0。合同检查169 JSON/110 Schema/36 Fixture通过；Research Automation lint/build、31个单测文件168项、4个隔离PostgreSQL集成文件19项通过；Platform typecheck、26个单测文件94项、Artifact owner-scope HTTP smoke（`testRunId=fc28515a-a02d-4c22-b5ae-7af435ed1b85`，`activeServicesTouched=false`）、Web typecheck通过。PostgreSQL集成覆盖迁移后证据跨账本实例读取、UNKNOWN时保留、相同证据重复写入和结算；单测覆盖非法Token计数、证据不可变、适配器协议/费用校验和未知费用不重发。以上测试不包含真实Provider调用或RD-Agent实验。

本轮完整V3.1 suite通过后应补录最新TestRun及计数。代码套件首次在受限网络沙箱里失败于本地`127.0.0.1:5433`权限；获准loopback的重跑执行完整隔离PostgreSQL与HTTP smoke。首轮集成发现JSONB字段顺序可能变化，已用字段级比较修正后完整重跑通过。没有访问凭证、外部网络调用、真实RD-Agent运行或活动服务变更。虽然DeepSeek/SiliconFlow传输适配器已有单测，但生产runtime wiring、实际供应商账单对账、强制网络/DNS出口、真实研究产物及人工验收仍缺；W5保持未完成。
