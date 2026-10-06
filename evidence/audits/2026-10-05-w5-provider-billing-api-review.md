# W5 Provider 账单核对接口官方文档复核

日期：2026-10-05。方法：只读查看两家Provider公开官方API/帮助文档；未读取凭据、访问供应商账户、调用API或调用模型。

## DeepSeek

- 官方`GET /user/balance`文档提供账户当前余额、币种、赠送余额与充值余额；它是余额快照，不含逐请求账单条目、扣费流水、发票明细或request/trace ID关联，因此不能把它当作账单对账接口。
- 官方Token Usage文档把单次生成响应中的`usage`定义为该请求token用量依据。它提供请求级usage，不提供独立账户扣费记录；请求已发送但响应丢失时，客户端无法由这个响应字段恢复usage/实际扣款。
- 本次审阅的官方FAQ有发票和按API Key查看用量主题，但公开可检索内容没有给出可用于服务端逐请求对账的账单API契约。此结论仅限已审阅公开文档，不能断言Provider不存在未公开/账户专属接口。

## SiliconFlow

- 官方Chat Completions接口响应含本次调用`usage`与响应追踪头；这是请求响应证据，不等于账户账单逐笔明细或超时请求的实际扣费回查。
- 官方2026-08-11更新说明：旧`/user/info`停止服务，替代账户API将后续提供；截至本次审阅的官方更新日志仍未给出替代API合同。
- 官方费率/用户指南描述收费调用进入账户费用账单，但未找到公开的账单逐笔查询API规范。公开资料不足以让服务端把本地请求usage、价格估算与账户账单逐笔核平。

## 结论和影响

账户余额查询可以作为未来的独立期初/期末余额核对信号，但不足以确认请求级扣费。当前真实Provider试验和发生不确定发送的请求仍保持BLOCKED/UNKNOWN与全额预算保留；不以usage成本估算或当前余额代替费用reconciliation。本审计没有外呼Provider、模型或账户。

官方来源：

- DeepSeek [Get User Balance](https://api-docs.deepseek.com/api/get-user-balance/)
- DeepSeek [Token & Token Usage](https://api-docs.deepseek.com/quick_start/token_usage/)
- DeepSeek [FAQ](https://api-docs.deepseek.com/faq/)
- SiliconFlow [Chat Completions API](https://docs.siliconflow.cn/docs/api/chat-completions-post)
- SiliconFlow [Release Notes](https://docs.siliconflow.cn/docs/release-notes/overview)
- SiliconFlow [Rate Limits and billing description](https://docs.siliconflow.cn/docs/userguide/faqs/rate-limit-and-upgradation)
