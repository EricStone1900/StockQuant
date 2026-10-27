# V2.1 C2真实容器闭环与授权门禁修复

日期：2026-10-18。用途：记录C2-A/C/C-D和C2-E本地部分增量。此记录不关闭C2，不取代V2.1阶段验收、OD-008来源授权或用户验收。

## 本轮交付

- 采样任务身份区分REAL/FIXTURE、配置版本和owner/account/namespace/TestRun范围；保存证券集合。相同身份同载荷幂等，同键异载荷冲突；latest按scope读取。schema v8升级覆盖既有任务身份与范围。
- Quote时间缺失/无效时年龄返回UNKNOWN；行情解析/传输错误保留null，不伪造0价。新闻离线解析要求文章类型、标题及同源canonical URL，文章ID由规范URL生成，不再用可变标题或首页标题冒充文章身份。跨源结果保留各来源文章引用与修订事实。
- Platform将V2.1 sources/quote/news/live-news和相关采样读取的Market Data错误按原HTTP状态透传。真实栈发现live-news授权拒绝原先被平台转成500；修复后Web路由返回403及`SOURCE_NOT_AUTHORIZED`、缺少授权项。

## 验证

- Market Data定向单测：`pnpm --filter @stockquant/market-data-service exec vitest run tests/unit/v21-market-observation.spec.ts tests/unit/tencent-quote-preview.spec.ts tests/unit/public-source-http-adapter.spec.ts`，3文件、11项PASS。
- Market Data、Platform API、Web `typecheck` PASS。
- `pnpm contracts:check` PASS（338 JSON、218 schemas、72 Fixtures、30生成客户端登记/漂移检查）。
- `pnpm fixtures:check` PASS（51文件、无Hash失败）；`pnpm docs:check` PASS（13946本地链接、5个V1编号阶段）；`git diff --check` PASS。
- `pnpm --filter @stockquant/market-data-service test:schema-migrations` PASS：迁移并发/重复启动、v1–v8、在线池作用域与恢复、采样配置/任务幂等和恢复、新闻revision/supersedes/重放均通过；临时PostgreSQL容器和网络自动清理。
- `pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke` PASS：20分钟设置、来源授权阻断、Fixture采样及重启恢复、作用域、新闻Fixture修订、externalRequests=0；临时容器与网络清理。
- `pnpm --filter @stockquant/web exec playwright test tests/e2e/v21-c2-observation.spec.ts` PASS 1/1。该用例使用Mock API，只作为页面交互证据。
- 真实容器隔离项目` sq-v21-stack-fd41b7bba2ac230d17b2`，Web `http://127.0.0.1:51014`，Platform `:51005`，Market Data `:50998`：Web `/api/v1/session`成功，V2.1采样配置可读写并持久化到PostgreSQL；在隔离V1.3 FakeBroker账户/TestRun `8c3e3711-b809-4f80-a27b-bb6218418406`写入两只股票scoped在线池，固定采样Fixture任务创建后按scope读回，重复请求返回`created=false`，两条READY观测、Manifest SHA-256 `9898f0b7ed9bf275766df22e26e64109c7ef92c47a0da6e1bffe5194cbaabc6c`，externalRequests=0。此Run来自V1.3账户，不作为V2.1完整同Run场景通过证据。
- 同一真实栈对实时新闻接口在来源授权关闭时返回403（修复前记录到500，修复后重新构建验证）。未调用任何Provider、未创建订单。栈按精确项目停止并核验容器、项目卷、网络、项目镜像及临时凭证已清理。

## 未完成及限制

- C2-B的实时行情Provider采样执行器、监控/收盘日线/策略/订单执行独立持久政策与Worker（领取、有限重试、租约和恢复）未实现；当前API诚实报告后四类为`NOT_CONFIGURED`。
- C2-C的独立DAILY_BAR来源、日线完成质量状态及防止SNAPSHOT混入日线的真实服务闭环未完成。quote的UNKNOWN/null边界修复不等于监控质量验收。
- C2-D实际两个来源的文章页面格式、稳定ID/时间/修订能力尚未授权验证。
- C2-E尚无完整V2.1 normal/rejection/recovery持久TestRun将采样、新闻业务ID/版本/断言绑定同一运行；尚无同Run CLI `--check-only`/导出实测。真实容器验证为账户作用域Fixture业务链，不等同完整正式验收Web工作流。
- OD-008当前为NONE/OPEN。真实至少1行情源+2新闻源、逐用途许可、覆盖/限流/留存和手册实测均保持NOT_RUN；本轮没有访问外部Provider。
- 第8节完整手册仍`DRAFT_NOT_EXECUTABLE`，新增范围用户人工验收NOT_RUN。不得签署或将C2/V2.1标PASS。
