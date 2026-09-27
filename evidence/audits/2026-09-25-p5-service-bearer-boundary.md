# P5 交易执行服务 Bearer 身份边界

日期：2026-09-25（Asia/Shanghai）

## 改动

按项目所有者已确认的每服务独立 Bearer Token，将 trade-execution-service 入站身份绑定到 `platform-api-service` 与 `historical-replay-worker` 两个不同凭据，并实施路由范围：仅历史回放身份可请求带治理授权的历史订单执行；平台身份可执行撤单、未知/过期状态转换和Outbox补偿；两个身份均可读取订单、Outbox与对账摘要。缺少、短于32字符或重复的token会使服务启动失败。伪造/未知 `service-id`、缺失Bearer、身份与token错配、跨scope请求均拒绝。

历史回放工作进程现在用自身Bearer身份调用执行服务和查询原单；V2.4观察处理器用平台Bearer读取日终对账摘要。Compose将已有平台/回放身份token注入执行服务。`STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION`仍用于执行服务调用portfolio-risk-service，与上述入站身份分开。

## 验证

| 检查 | 结果 |
|---|---|
| Trade execution 单测 | PASS，5个文件、31项；新增鉴权测试覆盖凭据强度/唯一性、缺失与伪造、路由范围 |
| Trade execution 类型检查 | PASS |
| Trade execution 隔离HTTP smoke | PASS：缺身份/伪造/未知调用方403；平台读200；回放读404；平台执行/回放撤单403；回放执行零量Fixture产生ZERO_VOLUME拒绝事实；治理mock验证trade-execution-service的独立Bearer；精确namespace清理 |
| Historical replay worker build | PASS |
| Platform API 类型检查与单测 | PASS，40项 |
| Compose `config --quiet`（读取本地忽略文件但不输出其内容） | PASS |
| V2.4 完整 code suite | PASS，`pnpm verify:stage -- --stage V2.4 --suite code`退出0；包含交易FakeBroker持久化、HTTP身份smoke、Portfolio与市场数据隔离PG集成、平台TestRun影子迁移、全仓构建/质量检查/单测、契约、Python适配器和82项运维脚本测试 |

## 边界

trade execution本地服务级HTTP smoke及专用PostgreSQL业务集成已通过；治理、回放入口与量化研究的身份边界仍以单测/构建/静态Compose验证为主，尚缺各自服务HTTP smoke。所有新增身份代码未部署，活动容器保留原版本。V2.4实际交易日观察和人工验收状态未因code suite改变。


## 后续调用链收口（2026-09-25）

身份盘点发现历史回放入站、治理授权申请/消费以及量化研究回放入口原先仍仅校验可伪造的service-id，现已补齐：平台到回放使用平台身份；回放自身到治理申请、量化研究入口使用回放身份；trade execution用自身身份消费治理授权。治理服务将申请与消费限制为各自调用方，量化研究只允许回放身份调用multi-bar路由。Compose为治理、回放和量化服务注入对应变量，删除已废弃的治理/回放允许名单配置。

| 新增复核 | 结果 |
|---|---|
| Decision governance | 4项单测，lint/build通过 |
| Historical replay worker | 10项单测，lint/build通过 |
| Quant research service | 5项单测，lint/build通过 |
| Platform API | 40项单测，lint通过 |
| Compose `config --quiet` | PASS |

治理、回放与量化服务目前仍主要以策略单测/构建和Compose解析为证据，尚缺各自的服务级HTTP smoke。trade execution有专用PostgreSQL HTTP smoke；最新V2.4完整code suite退出0，含FakeBroker、Portfolio、Market Data和platform_api_test迁移集成。测试只启动临时服务进程并使用专用测试库，没有重启活动服务或改动活动数据库；新身份代码保持未部署。

状态更新（2026-09-25）：治理、历史回放和量化研究的服务级 HTTP 鉴权 smoke 已补齐，使用随机名称临时 PostgreSQL 数据库，13 项允许/拒绝路由断言全部通过；凭据比较也改为常量时间。完整证据见[P7.2服务身份HTTP smoke](./2026-09-25-p7-2-service-identity.md)。旧容器/活动服务仍未部署新身份代码。
