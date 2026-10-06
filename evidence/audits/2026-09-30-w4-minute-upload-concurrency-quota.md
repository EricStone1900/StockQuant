# W4 V2.5 分钟上传并发配额审计

日期：2026-09-30（Asia/Shanghai）

## 目的

验证分钟数据上传在同一 owner 并发创建时仍遵守两份未完成上传配额，并确认取消能够释放准入名额。

## 实现与断言

扩展 `services/market-data-service/tests/integration/collection-run-postgres.spec.ts` 中的 PostgreSQL 集成场景：同一 owner 并发发起三个 `MinuteUploadRepository.create`。断言恰好两个获准，一个以 `MinuteUploadQuotaExceeded` 拒绝；取消其中一个已获准上传后，原先被拒绝且未持久化的 uploadId 重试成功。

## 实际验证

执行：

```sh
MARKET_DATA_DATABASE_URL=postgresql://market_data:market_data_local_only@localhost:5433/market_data pnpm --filter @stockquant/market-data-service exec vitest run tests/integration/collection-run-postgres.spec.ts
```

结果：退出码 0，1 个测试文件通过，22/22 项通过。首次在默认沙箱网络策略下运行因 `connect EPERM` 未执行用例；随后在获准访问项目本地 PostgreSQL 后通过。

## 边界

这是本地 PostgreSQL 上的隔离集成验证，证明 owner 配额的并发准入与取消释放。它不证明分钟全市场容量、吞吐上限、长期来源稳定性、来源研究许可、PIT、V2.5整体验收或真实交易能力；这些门禁保持原状态。
