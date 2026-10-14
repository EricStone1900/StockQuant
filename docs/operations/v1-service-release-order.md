# V1 服务发布顺序与回退准备

状态：**PREPARED / NOT AUTHORIZED / NOT DEPLOYED**。本Runbook把V1实际使用的服务调用依赖转换为逐阶段发布顺序。它是静态准备材料，不授权活动服务、数据库、容器、Artifact卷或策略操作，也不等同于Ubuntu迁移验收。

## 适用范围与来源

范围只包括V1.1–V1.5实际调用边；同一生成客户端中的V2/V3操作不纳入。调用归属以[跨服务调用矩阵A06](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a06.md)、V1.4 Platform/Replay范围校准[A23](../../evidence/audits/2026-10-11-v1-cross-service-route-matrix-a23.md)和当前生产调用点为依据。Web只调用Platform API；领域服务各自拥有数据库，跨数据库不执行联合事务。

| 阶段 | 先发布的依赖服务 | 后发布的调用方/消费者 | 明确排除或限制 |
|---|---|---|---|
| V1.1 | Portfolio Risk：账户初始化、快照 | Platform API → Web | 活动TestRun存储切换仍须独立备份、维护窗口和批准；此顺序不是切换授权 |
| V1.2 | Market Data Fixture API、Quant Research/Qlib Worker、Decision Governance snapshot API；三者在此调用图中可并行就绪 | Platform API → Web | 固定RD-Agent代码探针不是真实模型实验；不得启用真实来源或Provider |
| V1.3 | Market Data（日历只读边）、Portfolio Risk 与 Decision Governance | Trade Execution → Platform API → Web | Trade调用Portfolio入账/预留/结算和Governance授权；执行范围保持PAPER+FAKE |
| V1.4 | Quant Research（日线回测API） | Platform API → Web | Historical Replay Worker的服务级验证独立于正式V1.4 Platform页面；不得以该验证宣称页面已接线或将V2.3多bar入口纳入V1 |
| V1.5 | NATS/Temporal基础设施就绪；Portfolio Risk、Decision Governance、Trade Execution健康，并保留V1.3 Market Data日历依赖 | Platform API/outbox协调 → Web → 受控启动对应Worker/Workflow消费 | Worker消费只在隔离验收场景启用；不得连接真实Broker、真实数据源或活动策略。V1.5完整实机/宿主恢复仍未验证 |

这张表描述运行时API依赖，不描述数据库迁移先后。数据库必须按各自所有者使用[独立迁移CLI](./v1-database-migrations.md)逐库检查/应用；该CLI不提供跨库原子性或依赖拓扑保证。迁移、服务发布和Worker消费启用是三个独立门禁，前一项成功不能推定后一项通过。

## 每阶段发布前检查

1. 冻结候选源码、Web/API/服务镜像摘要、依赖锁、OpenAPI/生成客户端兼容性、Compose配置Hash和每个服务的迁移清单。冻结后任何源码/Schema变化都重新构建并重跑受影响阶段套件。
2. 对目标逐一确认环境和服务身份；调用方的Bearer只授予其契约列出的路由。确认版本模式仍为BACKTEST或PAPER加FAKE，LIVE写入关闭，V2来源和V3模型调用授权未设置。
3. 在独立隔离PostgreSQL逐服务执行check/apply/check和重复应用；阶段验证使用`pnpm test:db:migrate:v1 -- --stage V1.x`。生产候选还须有覆盖数据库、角色、Artifact的配对备份及真实恢复证据。当前隔离迁移套件不能替代该备份。
4. 依表先启动提供者API并核验`/ready`、契约、身份拒绝和持久化读回；再启动调用方。每个服务通过其阶段normal/rejection/recovery和同一Web `testRunId` 的只读CLI核对后，才推进到下一服务。
5. V1.5先确认NATS/Temporal持久化和队列健康，再部署业务API、Platform协调端与Web；只在隔离场景中受控启动Worker消费。检查订单/Fill/Portfolio账本/授权预算/Outbox/Artifact均绑定同一Run，并验证重复投递不产生重复业务事实。

## 失败停止与回退

- 任一服务健康、身份、合同、迁移或账本断言失败时停止推进并保留日志和原状态；禁止随机重跑、重置Run、删表或清除业务事实来制造绿色结果。
- V1没有通用down migration。只有确认新Schema向后兼容且前一镜像/配置摘要可核实时，才可准备应用层回退；追加的TestRun、事件、订单和Fill必须保留。
- 若新旧代码不兼容，先停止写入，再按独立迁移Runbook将**配对备份恢复到新的隔离数据库**，逐项核对表、行、owner、业务ID、订单/账本、ArtifactRef及Hash；未完成真实恢复验证前不得切换连接配置。
- 活动Platform存储仍有legacy模式、Artifact挂载漂移和旧非终态Run处置前置项；维护负责人、窗口、目标实例、备份介质、恢复/回切负责人和精确批准均未齐备时，状态保持NOT_READY/NOT_AUTHORIZED/NOT_DEPLOYED。

## 当前验证状态

V1.1–V1.5各阶段隔离迁移CLI及适用代码套件有通过记录；Trade的13条V1受保护写路由身份策略单测已逐路由覆盖。它们验证隔离代码和数据库，不验证活动发布先后、镜像回退、跨服务配对备份恢复或Ubuntu实机。本Runbook仍是PREPARED；活动部署、真实回退和阶段/版本人工验收均为NOT_RUN。
