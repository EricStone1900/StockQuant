# W5 DeepSeek 版本费率计算离线验证

日期：2026-09-30。命令：`pnpm verify:stage -- --stage V3.1 --suite code`。退出码：`0`。

## 结果

- Research Automation：lint通过，27个单测文件/157项通过；4个隔离PostgreSQL集成文件/19项通过。
- Platform：typecheck通过；26个单测文件/94项通过。
- Web typecheck通过。合同检查通过：169个JSON、110个Schema、36个Fixture、生成客户端和兼容规则均通过。
- Artifact owner-scope HTTP smoke通过，`testRunId=d5c0fc67-779e-44c9-b418-7cc554a5d25c`，`activeServicesTouched=false`；该Run使用合成验收数据。
- 新增DeepSeek用量/费用纯函数定向单测3/3通过；按缓存命中、未命中及输出token分别计算，要求显式峰/谷窗口及自洽usage，并向上取整美元美分预算预留。

## 边界

没有读取凭证、发起DeepSeek/SiliconFlow请求、启动RD-Agent或生成真实研究产物。费用结果类型为`CALCULATED_COST`，账单核对字段明确为`NOT_PERFORMED`；不结算真实Provider账本，不宣称V3.1业务流程或验收通过。供应商适配器、invoice级对账、强制网络/DNS allowlist和实际Linux Runner仍缺。

