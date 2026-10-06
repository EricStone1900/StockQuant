# W1 V1.2 固定日线 Fixture 客户端审计

- 日期：2026-10-01
- 范围：Market Data 正常/未来数据固定 Fixture 预览、DC-08A只读页的持久采集计划及缺口读取的 OpenAPI、canonical schema、生成 Platform client；Platform预览路由、V1.2 TestRun及DC-08A页面迁移。
- 契约：`getV12NormalFixturePreview` 与 `getV12FutureFixturePreview` 均限定 `platform-api-service` ServiceBearer，响应引用 `v12-fixture-preview-v1.schema.json`。
- 设计：异步 V1.2 接受服务通过 Fixture reader 端口获取固定数据；Platform 路由复用相同生成客户端。Quant/Qlib 路径未在本次改变。
- DC-08A：新增两个Bearer保护的只读GET operation；页面继续在现有用户身份门禁后并发读取Ready探针、计划和缺口。控制写接口、活动订阅、采集和来源均未调用。
- 验证：最新`pnpm contracts:check`与`pnpm baseline:check`通过（192 JSON、131 schema、36 fixtures，兼容矩阵98 consumer rules；1,643本地链接）；Platform typecheck/unit suite通过（132 tests），Market Data unit suite通过（63 tests）；最新`pnpm verify:stage -- --stage V1.2 --suite code`受控复跑退出0，包含全仓baseline、build、typecheck、unit及Qlib worker 13项测试。
- 环境限制：普通沙箱执行 Qlib worker boundary 测试时，临时 loopback bind 返回 `EPERM`；受控复跑只用于该已配置本地 socket 测试，无外部请求。
- 安全边界：只读冻结仓库 Fixture；Provider 调用0；FakeBroker/NO_TRADE；未触碰或部署活动服务；未改变来源许可、O1/O2观察状态或人工验收。
- 结论：本次 V1.2 Market Data Fixture代理边界有契约和生成客户端，代码套件通过。它不代表 V1.2业务/版本门禁、Qlib实际Stage场景、Web人工验收或发布门禁通过。

## 文件

- `packages/contracts/openapi/market-data-calendar.v1.json`
- `packages/contracts/schemas/market-data/v12-fixture-preview-v1.schema.json`
- `packages/contracts/generated/types.ts` 与服务投影
- `scripts/generate-v21-market-data-client.mjs`
- `services/platform-api-service/src/contracts/generated-v21-market-data-client.ts`
- `services/platform-api-service/src/application/v12-acceptance.ts`
- `services/platform-api-service/src/bootstrap/app.module.ts`
- `services/platform-api-service/tests/unit/generated-v12-fixture-client.spec.ts`
- `services/platform-api-service/tests/unit/v12-acceptance.spec.ts`
- `services/platform-api-service/src/bootstrap/app.module.ts` 中 `Dc08AcceptanceController`
