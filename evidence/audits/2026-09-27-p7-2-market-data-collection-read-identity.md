# P7.2 Market Data 采集运维读取身份审计

日期：2026-09-27（Asia/Shanghai）  
结论：源代码与隔离 HTTP 验证通过；活动 Compose 未部署本次改动，当前运行实例仍需在合适维护窗口更新后才能宣称运行态收口。

## 范围

按项目已确认的服务身份规则，给 Platform API 内部采集运维读取增加 `STOCKQUANT_SERVICE_TOKEN_PLATFORM_API` Bearer 身份门禁。覆盖调度状态/计划、订阅列表与详情、采集健康、采集运行、分钟缺口、回填任务和分钟来源健康读取；后续路由复核又纳入固定分钟 Fixture 预览，以及分钟质量/覆盖计算POST。用户已明确选择每服务独立Bearer Token；Token决定调用者身份，`x-stockquant-service-id`可省略，如提供则必须与`platform-api-service`匹配。

`/live` 与 `/ready` 继续允许容器健康探针读取；CN A 股交易日历保留公开读取。采集写控制继续由独立 `STOCKQUANT_COLLECTION_CONTROL_TOKEN` 授权，不与服务 Bearer 合并。复核又发现V1.2的两个固定日线Fixture端点此前可匿名直读，且Platform控制器没有用户Session门禁；现Market Data要求平台Bearer，Platform代理先验证Session并转发服务身份。V1.2后台TestRun取Fixture也携带平台Bearer。其他非采集行情/导入路由仍需独立分类，不在本次证明范围内。

Platform API 的 DC-08A 页面现在先验证本地用户 Session，再携带 Platform Bearer 请求订阅及缺口数据。V2.2固定Fixture预览与scenario discovery也增加Session校验，预览代理携带Platform Bearer。宿主运维脚本从环境或忽略的 `.env.local` 读取服务 Bearer；不打印 Token。`data-cli` 同时分别发送服务 Bearer 和适用的控制令牌。

## 验证

- `pnpm --filter @stockquant/market-data-service build`：通过。
- `pnpm --filter @stockquant/market-data-service test`：15 文件、62 项通过。
- `pnpm --filter @stockquant/platform-api-service build`：通过。
- `pnpm --filter @stockquant/platform-api-service test`：18 文件、56 项通过。
- `pnpm test:ops`：96 项通过。
- `pnpm --filter @stockquant/market-data-service service-auth:http-smoke`：退出 0。9 类采集读取全部验证匿名 401、Platform Bearer 非 401、错误声明身份 401；无持久化配置的临时服务按预期返回 503，调度状态/计划返回 200；公开日历返回 200。
- 扩展后的 HTTP smoke 另验证 `/v2/minute/preview` 匿名401/Bearer200，`/v2/minute/quality` 与`/v2/minute/coverage`匿名401/Bearer抵达校验器422。V2.2 Platform scenarios/preview 的Session和Bearer转发控制器测试2/2通过。
- 最新隔离HTTP smoke增加V1.2正常/拒绝Fixture：匿名401，Bearer 200；V1.2后台验收单测确认两个Fixture读取都发送平台Bearer。Market Data 62/62、Platform API 56/56和两服务构建通过。
- 扩展smoke还验证V1.2 Artifact发布及V2.1采样配置写入匿名401、有效Bearer成功；采样在短命进程内恢复至原默认30分钟。行情熔断在有效Bearer下触发并随即恢复，Watchlist也在退出前恢复初值。
- 本地Vite+真实Chromium运行`apps/web/tests/e2e/v22-csv-upload.spec.ts`：3/3通过（小CSV预览发布、大CSV刷新续传、冻结BaoStock 5m导入）。这些场景使用测试API拦截，验证的是页面流程，不代表连活动服务或增加采集观察。
- `pnpm verify:stage -- --stage V2.1 --suite code`：完整退出 0；包含 baseline、monorepo build/lint/typecheck/unit、FakeBroker/Portfolio 隔离集成、96项运维测试、上述身份smoke及`market_data_test` PostgreSQL 集成22项和分区HTTP smoke。
- `pnpm verify:stage -- --stage V2.2 --suite code`：本轮V2.2入口收口后完整退出 0；相同全仓代码门禁通过，覆盖了V2.2新增Session保护和分钟Preview的Platform Bearer转发单测。
- `pnpm verify:stage -- --stage V1.2 --suite code`：完整退出0，包含最新V1.2后台Bearer断言与全仓build/typecheck/unit；code suite不执行V1.2业务场景。V1.2 CLI normal/rejection/recovery固定场景入口也改为从环境/忽略的`.env.local`读取平台Bearer，并为Market Data和Quant请求附加平台调用身份。

隔离 HTTP smoke 使用临时随机端口及短命子进程，不连接活动采集数据库、不写订阅状态，也不调用外部行情源。Platform API DC-08A 和 V2.2 的 Session/Bearer 转发由新增控制器单测验证；本次未在浏览器连活动实例。

## 未完成

## Market Data 路由分类复核

对 `services/market-data-service/src/main.ts` 当前路由逐条盘点后，入口采用以下边界：

| 边界 | 路由范围 | 身份规则 |
|---|---|---|
| 平台服务身份 | 业务Fixture/Artifact、采集与订阅运维读取、行情/新闻/Watchlist/采样业务、分钟Fixture/质量/覆盖及CSV/Parquet导入 | `STOCKQUANT_SERVICE_TOKEN_PLATFORM_API` Bearer；声明的`x-stockquant-service-id`只作匹配校验 |
| 采集控制身份 | 调度启停/配置、创建或恢复采集任务、缺口写入、回填任务控制 | `STOCKQUANT_COLLECTION_CONTROL_TOKEN`；与服务Bearer分离 |
| 项目访问身份 | 项目Access、数据分页/导出/去重相关路由 | 各项目访问令牌及其owner/scope，不接受服务身份替代 |
| 公开有限读取 | `/live`、`/ready`、CN A股交易日历 | 健康探针、编排状态和只读日历；不得返回采集业务详情 |
| 测试专用 | `/__test/minute-import-gate` | 仅`NODE_ENV=test`且显式开启时注册 |

行情来源熔断/Smoke、Watchlist、采样变更及分钟Fixture端点均归入平台服务身份。追加隔离HTTP匿名矩阵后，43个method/path代表项覆盖平台Bearer分类规则的每个路由族和CSV/Parquet上传、chunk、finalize/read等变体，均在路由处理前返回401；9类持久采集读取另覆盖匿名401、Bearer放行、声明错身份401。此为受保护路由族代表项，不是所有业务输入/输出组合的穷举。项目身份另测4个无需持久存储的端点：无凭据仓储时，伪造project ID/scopes与仅有Platform Bearer均401；Project Access/数据Artifact其余持久路由的正向权限仍以PostgreSQL集成测试为依据。

复核期间发现项目接口无PostgreSQL时退回信任调用者提供的`x-stockquant-project-id`和`x-stockquant-scopes`，可伪造数据权限。现`projectActorForRequest`在项目凭据仓储缺失时返回未认证，不接受调用方自报scope；只有持久项目Token仓储成功鉴权后才构造actor。无数据库随机HTTP子进程覆盖projects/access、data/page、data/export、queue-metrics四端点，伪造项目声明和Platform服务Bearer都返回401。

活动 Market Data 容器未重启/重建，以保留当前采集任务及观察连续性。变更后完整`pnpm verify:stage -- --stage V2.1 --suite code`退出0：全仓build/lint/typecheck/unit、58个Python适配器测试、运维测试、受保护路由HTTP smoke及Market Data PostgreSQL集成22项全部通过。此审计证明当前源码与隔离HTTP行为，不证明线上运行实例已具备这些门禁。后续部署需核实Bearer在Market Data与Platform API配置一致、逐项完成活动实例HTTP验证和密钥轮换演练，再等待阶段人工验收。

为验证共享分钟导入服务未回归，另运行完整`pnpm verify:stage -- --stage V2.2 --suite code`，退出0；同一43项匿名路由代表矩阵、全仓build/lint/typecheck/unit、58个Python适配器测试、Market Data PostgreSQL 22项及V2.2 Web/入口检查均通过。活动容器仍未更新。
