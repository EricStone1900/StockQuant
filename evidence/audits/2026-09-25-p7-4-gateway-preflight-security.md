# P7.4 模型网关预检安全边界

日期：2026-09-25（Asia/Shanghai）

## 变更

模型网关配置预检此前只比较 URL 主机名和允许列表，`http://` 远程地址、URL 内嵌用户信息或 query 参数可能被判为 READY；主机校验也忽略了非标准端口。

现已要求模型与Embedding地址使用 HTTPS，拒绝 URL 用户名/密码、query 和 fragment；允许列表只接受精确主机/authority，通配符与非法条目拒绝，非标准端口必须在允许列表中逐字匹配。返回的预检结果只包含规范化白名单与通用缺项，不回显 URL 或凭证内容。

## 验证

- `pnpm --filter @stockquant/research-automation-service test`：18个测试文件、78项测试通过；新增测试覆盖明文HTTP、URL内嵌凭证、query泄漏、端口不匹配和通配符。
- `pnpm --filter @stockquant/research-automation-service build`：通过。
- `pnpm baseline:check`：Markdown链接559项、32个Schema、19个Fixture、21项契约兼容规则、3份OpenAPI及Fixture哈希检查通过。
- `git diff --check`：通过。

## 未验证/未启用

这是配置预检，不发送网络请求。没有启动真实Provider或Embedding请求，没有验证HTTP客户端重定向行为、Docker/主机防火墙是否拦截白名单外流量、供应商TLS证书/域名或实际账单与用量对账，也没有新增请求前费用预留和响应费用结算链路。Gateway当前模式与实际模型调用保持现状；P7.4、V3.1真实实验及OD-009不因此关闭。
