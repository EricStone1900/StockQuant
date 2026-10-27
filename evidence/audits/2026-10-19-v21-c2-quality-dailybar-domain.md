# V2.1 C2-C质量与独立日线领域切片

日期：2026-10-19（Asia/Shanghai）  
结论：**Market Monitor质量规则和Market Data独立DAILY_BAR Fixture门禁已完成纯领域/固定输入验证；持久消费者与Web闭环尚未完成。**

## Market Monitor质量规则

`services/market-monitor-service/src/stockquant_market_monitor/domain/quote_quality.py`消费预期证券ID及Market Data观测引用，派生fresh数量、覆盖比例、最大有效年龄和确定性异常。缺失/陈旧/未知均不能算fresh；无有效观测为`UNAVAILABLE`，部分覆盖为`PARTIAL`，只有全部预期证券fresh才为`READY`。重复预期证券或同证券重复观测拒绝。

验证：`PYTHONPATH=src python3 -m unittest discover -s tests/unit -v`，4/4通过；`uv lock --offline`与`uv sync --frozen --offline`通过。质量结果尚未持久化，也未接HTTP、专用服务身份、调度或Web。

## 独立DAILY_BAR门禁

新冻结Fixture：`fixtures/v2/v2.1-daily-bar-completion/bars.json`，版本`v2.1-daily-bars-1`，SHA-256 `b98309c9be021c2117d9b3b53276b4ddb313de290413f6bfea5b7040361ae6c4`。Manifest明确合成来源、仅模拟用途；数据只有CN_A RAW DAILY_BAR，包含两证券的OHLCV、收盘/请求/可用时点及数据版本。

`validateDailyBarCompletion`在Market Data应用层检查来源不得为snapshot、data/fixture版本、收盘后请求、availableAt不早于收盘和请求、预期证券完整覆盖、证券唯一、session一致、OHLCV有效。REAL授权作为独立可信调用参数输入，未授权时返回`BLOCKED_SOURCE_AUTHORIZATION`。完成身份按scope、来源、数据模式、Fixture/data版本、session、证券范围和排序后的bar内容确定性计算。

验证命令与结果：

- `pnpm --filter @stockquant/market-data-service exec vitest run tests/unit/v21-daily-bar-completion.spec.ts`：6/6通过。
- `pnpm --filter @stockquant/market-data-service typecheck`：通过。
- `pnpm fixtures:check`：52个Fixture文件，0失败。
- `pnpm docs:check`：14,006个本地链接，0失败；5个V1阶段编号无重复。
- `node scripts/validate-json.mjs packages/contracts fixtures`：341个JSON、219个schema、73个Fixture，0失败。
- `git diff --check`：通过。

## 未完成与范围

DAILY_BAR目前只有冻结输入和纯校验逻辑：没有持久任务/结果仓储、HTTP/Platform路由、服务间身份、Web读写展示、worker恢复或持久化幂等重放。Monitor结果也尚无独立数据库/API。上述行为不能替代V2.1 C2正常/拒绝/恢复同Run验收；真实日线来源许可和能力未验证，REAL开关未启用。本切片不触发外网、模型或订单。
