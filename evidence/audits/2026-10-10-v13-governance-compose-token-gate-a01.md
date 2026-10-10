# Governance Compose caller token配置门禁验证

日期：2026-10-10。仅验证Compose配置解析，不启动或修改活动服务。

- `docker compose --env-file .env.local -f infra/compose/docker-compose.yml config --quiet`：exit 0，当前本地配置满足Compose解析条件。命令使用被忽略的本地环境文件，不输出其内容。
- `env STOCKQUANT_SERVICE_TOKEN_PLATFORM_API= docker compose --env-file .env.local -f infra/compose/docker-compose.yml config --quiet`：exit 1，并在Governance服务的Platform API token字段报告required variable missing a value；确认空值不能绕过必填门禁。

本检查只验证Compose插值层；最小长度和三身份互异由Governance `loadGovernanceTokens`启动加载器验证。完整代码与HTTP/PG回归见[V1.3 code suite](./2026-10-10-v13-governance-platform-token-required-code-suite-a01.log)。
