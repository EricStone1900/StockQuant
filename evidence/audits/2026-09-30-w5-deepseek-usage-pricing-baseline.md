# W5 DeepSeek 接口用量与价格基线

读取日期：2026-09-30。状态：`REFERENCE_ONLY / NO_PROVIDER_CALL / NOT_COST_RECONCILIATION`。

## 固定接口观察

- OD-009 草案指定 Chat Provider 为 DeepSeek，model ID 为 `deepseek-flash`，基址为 `https://api.deepseek.com/`，预算币种为 USD。
- 官方 [Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/) 描述了 `POST /chat/completions`，返回 model、choice 和 usage。Usage 包括 `prompt_tokens`、`completion_tokens`、`total_tokens`、缓存命中/未命中 token 数及推理 token 明细。响应字段提供 token 用量，不提供本次美元账单金额。
- 官方 [Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/) 在本次读取时将 `deepseek-flash` 对应到 DeepSeek-V4.1-Flash，并声明输入/输出按每百万 token 计费，存在峰时/非峰时以及输入缓存命中/未命中的不同费率；文档同时保留厂商调整价格的权利。

| 计费项（USD / 1M tokens） | 非峰时 | 峰时 |
|---|---:|---:|
| 输入，缓存命中 | $0.003 | $0.006 |
| 输入，缓存未命中 | $0.15 | $0.30 |
| 输出 | $0.60 | $1.20 |

官方页面在本次读取时将 UTC 周一至周五 01:00–04:00、06:00–10:00（中国公共假期除外）列为峰时，其余时段列为非峰时。费率与模型映射必须在真实请求前重新核实，并以具有版本/Hash 的审批快照作为该次实验输入；不能在响应后选费率。

## 对 W5 实现的约束

1. Provider 适配器须保留请求 ID、实际返回模型、usage 明细、请求时间和固定费率版本；缺 usage、模型不符或响应不完整都不得推断为零成本。
2. 按已冻结的费率快照计算只能标为 `CALCULATED_COST`。在尚无账单级对账证据时，它不能标成供应商 `ACTUAL_COST`，也不能解除 W5 的“actual Provider cost reconciliation”门禁。
3. 超时/连接中断仍是 UNKNOWN：不得因本地没有响应而释放预留或重发同一调用；须按供应商 request ID/用量对账流程查明后才可结算。
4. 本次仅阅读公开官方文档，未解析凭证、未发起 Provider 请求、未产生费用，也未更改 OD-009 的草案/开放状态。外发 allowlist、实际供应商账单校验及实时模型调用仍未完成。

