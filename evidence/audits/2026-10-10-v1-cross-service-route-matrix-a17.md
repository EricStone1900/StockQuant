# V1 跨服务调用矩阵 A17 增量证据

日期：2026-10-10。补充Portfolio Risk入站服务Caller身份凭据复用拒绝。

Portfolio Risk的路由授权器以`x-stockquant-service-id`选择caller、以Bearer证明身份；原逻辑在ready检查缺失和弱token，但没有防止Platform API、Trade Execution、Historical Replay共享同一Bearer。现新增`arePortfolioServiceCredentialsValid`：三个服务token均须至少32字符且两两互异，请求授权及`/ready`共用校验，任一缺失/弱/重复配置均不授权；Compose同步对三份token设必填插值。

定向测试3/3覆盖Platform/Trade、Platform/Replay复用及弱凭据拒绝；Portfolio typecheck通过。完整V1.1与V1.3 code suite exit 0，隔离PostgreSQL、服务HTTP smoke、迁移与资源清理通过；Compose有效配置exit 0、空Replay token exit 1。完整日志见[V1.1](./2026-10-10-v11-portfolio-distinct-identities-code-suite-a01.log)及[V1.3](./2026-10-10-v13-portfolio-distinct-identities-code-suite-a01.log)。

本项是Portfolio配置/策略证据，不证明活动服务重启，不替代全V1身份发布矩阵、交易规则验证或阶段/版本验收。
