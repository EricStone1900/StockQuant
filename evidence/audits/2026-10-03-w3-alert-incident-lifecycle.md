# W3 告警事件端到端隔离工程切片

时间：2026-10-03。用户已确认 `NO_TRADE` 且暂无数据源授权。本审计覆盖本地告警Incident持久化、Market Data API、Platform会话代理、共享OpenAPI生成客户端和 `/paper` 页面；未启用行情采集、通知外投或交易执行。

## 行为

Market Data 以 PostgreSQL 保存告警Incident。同一 `alertKey` 在 `OPEN`/`ACKNOWLEDGED` 期间只保留一个活动事件；重复异常更新最近发生时间和载荷。受保护的 `GET /v2/alerts` 返回活动事件；`POST /v2/alerts/{incidentId}/acknowledge` 幂等确认并保留首次操作人。采集成功回调关闭同一订阅/窗口的事件，之后再次失败创建新事件。Incident开启/恢复及对应Outbox事件在同一 PostgreSQL 事务提交。

`market-data-calendar.v1`为上述操作提供Bearer保护的OpenAPI及生成TS/Python契约；Platform要求登录会话，并从会话解析确认用户身份，通过自身服务Bearer访问Market Data。`/paper`显示严重级别、告警码、状态和最近发生时间；用户主动点击后才确认告警。没有实现外部通知dispatcher或完整日终交易对账。

`collectionExecutor`继续要求精确来源授权和显式开关；当前无来源授权时不会启动真实采集。Platform/Web自动化使用Mock Market Data响应，真实持久化行为只在隔离PostgreSQL测试中运行。

## 验证

- Market Data：单测18文件/71项；typecheck及build通过。
- Market Data PostgreSQL集成：24/24通过；使用临时镜像`sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`，测试容器/网络清理并核实。
- Platform：单测49文件/175项，typecheck及build通过；告警平台代理与生成客户端定向单测4/4通过。未登录、格式错误Incident ID都在外呼前拒绝；确认操作者由登录Cookie绑定。
- Web：生产构建通过；Chromium E2E 1/1通过，证明告警呈现与显式确认交互；测试使用Mock业务API。首次沙箱运行本地WebServer因`EPERM`不能绑定5173，保留失败；获准的本地临时WebServer重跑通过。
- `contracts:generate`、`contracts:check`、`baseline:check`通过；生成器注册25项、OpenAPI门禁17项、基线测试26/26。
- `docs:check`：3614链接、0失败；`git diff --check`通过。
- V1/V2/V3 `verify:version`均保持`INCOMPLETE`/exit 2，阶段与验收行分别未决5/5、5/5、4/4；三版证据引用审计均PASS且无哈希错误。这些是总计划当前门禁，不属于告警切片失败。
- 曾误运行快捷`pnpm test:integration:market-data`，其默认本机5433连接遭沙箱`EPERM`，24项全部跳过；不计通过。之后项目指定隔离PostgreSQL harness运行24项通过。

外部行情/Provider/通知调用：0。活动服务与正式数据库：未触碰。W3活动部署、真实行情/策略连续Paper、完整日终对账、外部通知、O1/O2观察和人工验收均未完成；本工程切片不关闭W3或总计划。
