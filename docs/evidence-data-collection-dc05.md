# DC-05 质量、缺口与覆盖证据

验证日期：2026-09-12（Asia/Shanghai）。本证据覆盖确定性质量/覆盖算法和接口，不宣称真实 60 交易日数据已完成。

## 实现

- `services/market-data-service/src/application/minute-quality.ts`：统一检查重复键、OHLC 越界、非交易时段、非有限数、负量额和严格 amount 缺失。
- 按版本化交易日历生成每证券每 5 分钟应有窗口；闭市不生成窗口，未知日历返回 `WAITING_DEPENDENCY`。
- 生成 `GapRecord`（缺失/重复、P0/P1/P2），按缺口年龄排序，超过一天的缺口提升为 P0；不伪造 Bar 或用 close×volume 补 amount。
- `buildCoverage` 输出 expected/valid/missing/duplicate、覆盖交易日数和可解释状态。
- 新增接口：`POST /v2/minute/quality`、`POST /v2/minute/coverage`。

## 自动验证

```bash
pnpm --filter @stockquant/market-data-service lint
pnpm --filter @stockquant/market-data-service exec vitest run tests/unit
MARKET_DATA_DATABASE_URL='postgresql://market_data@127.0.0.1:5433/market_data' \
  pnpm --filter @stockquant/market-data-service exec vitest run tests/integration
pnpm docs:check
pnpm contracts:check
pnpm fixtures:check
```

结果：TypeScript 检查通过；4 个单元测试文件、12/12 通过；真实 PostgreSQL 回归 7/7 通过；文档/合同/Fixture 校验通过。HTTP 烟测中，1 条合格 Bar 返回 `READY`；单日仅 1/48 条时返回 HTTP 422、47 个缺口并保留覆盖报告。

## 结论与限制

DC-05 当前为 `IN_PROGRESS`。质量规则、缺口台账算法、补采优先级和接口已完成。真实数据的 60 交易日覆盖、停牌/上市状态权威核验、持久 GapRecord/补采任务和每日覆盖报告仍需后续持久化/部署切片；不得把 Fixture 覆盖结果当作真实数据验收。
