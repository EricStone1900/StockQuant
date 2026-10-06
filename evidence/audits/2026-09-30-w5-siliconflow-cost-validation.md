# W5 SiliconFlow Embedding 费用估算与回归

日期：2026-09-30。验证命令：`pnpm verify:stage -- --stage V3.1 --suite code`；退出码：`0`。

## 官方费率快照

SiliconFlow 官方[Qwen3-Embedding-4B模型页](https://www.siliconflow.com/models/qwen3-embedding-4b)在本次读取时将`Qwen/Qwen3-Embedding-4B`的Input Price列为USD 0.02 / 1M Tokens。本快照是带读取日期的计算输入；真实运行前需要再核验当前页面和请求时费率。它不是用户对Provider调用/支出的确认，也不是供应商发票。

新增`calculateSiliconFlowEmbeddingCost`：使用版本化USD费率和响应`prompt_tokens`估算预留额，向上取整至美分；结果为`CALCULATED_COST`，并带`invoiceReconciliation=NOT_PERFORMED`。没有接入生产网关或账本，不代表真实收费准确。

## 验证结果与边界

- Research Automation lint通过，29个单测文件/161项通过，4个隔离PG集成文件/19项通过；Platform typecheck和26个单测文件/94项通过；Web typecheck通过。
- 合同检查通过（169 JSON、110 Schema、36 Fixture）。Artifact owner-scope HTTP smoke通过，`testRunId=6b28adb6-8eb3-427b-89de-6946e797abbb`，`activeServicesTouched=false`，数据为合成验收Run。
- DeepSeek费率与SiliconFlow费率离线算法、两家响应校验均只用Fixture/纯函数测试。本次没有读凭证、发起真实模型请求、启动RD-Agent、核对账单或产出真实研究Artifact。
- 真正的Provider/账单级核对、强制网络/DNS egress、受控Linux Runner以及V3.1阶段人工验收仍缺。OD-009保持OPEN。

