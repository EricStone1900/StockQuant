# Portfolio Risk Compose caller token配置门禁验证

日期：2026-10-10。只解析Compose配置，不启动或修改活动服务。

- `docker compose --env-file .env.local -f infra/compose/docker-compose.yml config --quiet`：exit 0。
- `env STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY= docker compose --env-file .env.local -f infra/compose/docker-compose.yml config --quiet`：exit 1；Portfolio Risk的Replay caller token被标为必需变量，空值不能通过Compose插值。

Compose检查不验证token互异性；实际配置校验由Portfolio Risk共享的`arePortfolioServiceCredentialsValid`执行，定向服务身份单测及V1.1/V1.3完整代码套件通过。命令仅使用忽略的本地环境文件，不输出其内容。
