# W3 行情来源授权入口审计

时间：2026-10-03 08:25 Asia/Shanghai。范围：静态审阅当前 Market Data 服务与 Python 采集适配器，并运行不访问外部行情源的定向授权单测。遵守 `NO_TRADE`；来源授权仍为 NONE。

## 结论

本轮审阅未发现无授权外呼路径，不需要修改业务代码。采集执行器需同时满足显式 `STOCKQUANT_COLLECTION_EXECUTOR=1` 与配置源集合的用途授权；授权同时校验精确 `true`、非空授权引用、数据版本、每一个配置来源均在白名单。Python CLI 在构造 BaoStock、Sina、Eastmoney 或 TDX 客户端之前再次校验本次请求的来源集合。来源顺序包含任何未授权项时，Node 启动守卫会禁用执行器，适配器边界也会拒绝请求。

Quote 与 live news 路由先验证用途及相应来源白名单再调用 HTTP adapter；source smoke 在请求任一端点前要求 QUOTE/NEWS 各自完整授权，不满足时返回 `403` 和 `externalRequests: 0`。本轮没有调用这些路由或外部端点。历史分钟数据路径为本地上传/Fixture/已冻结归档导入；历史研究授权目前是独立 fail-closed 配置/辅助检查，没有发现服务内绕过它直接联网取历史数据的调用点。

## 验证

- `services/market-data-service`: `pnpm exec vitest run tests/unit/external-source-authorization.spec.ts`：1 文件、4 测试通过。
- `services/market-data-adapter`: `UV_CACHE_DIR=.uv-cache uv run --frozen pytest tests/test_providers.py -q`：34 测试通过，含适配器拒绝未授权和精确来源白名单场景。系统 Python 缺 pytest；首次 uv 默认缓存路径受沙箱拒绝，改用服务本地 `.uv-cache` 后在锁定环境通过。
- 测试仅用注入配置/模拟对象；未发出行情或 Provider 请求，未触碰活动服务、容器、策略、订单或账户。

## 未覆盖项

这是静态调用图加单元测试审阅，不是 Ubuntu/容器活动部署验收，也不授予任何来源使用权。用户明确确认 `NO_TRADE` 与“暂无线源授权”；在新授权证据及相应审批出现前，行情采集和真实来源观察继续关闭，Fixture/本地归档验证不受影响。
