# DC-08A 启用前准备记录

状态：`READY_NOT_ENABLED`。本记录只证明启动输入已冻结和代码链路已验证，不代表已经完成实际交易日观察。

## 冻结输入

- 计划：`v2-data-collection-cn-5m-v1`
- 市场/频率：`CN_A_SHARE` / `MINUTE_BAR` / `5m`
- 证券集合版本：`baostock-minute-20x60-v1`
- 输入文件：[collection-plan-v1.json](../fixtures/v2/data-collection/collection-plan-v1.json)
- 输入 SHA-256：`045595a9923a826e0413e9ad3708dc9409effaeeb007e794634bc21faf4d26a9`
- 数量：20；服务格式映射为 `600000.SH,600004.SH,600006.SH,600007.SH,600008.SH,600009.SH,600010.SH,600011.SH,600012.SH,600015.SH,600016.SH,600017.SH,600018.SH,600019.SH,600020.SH,600021.SH,600022.SH,600023.SH,600025.SH,600026.SH`
- 主备策略：BaoStock → Sina；复权：RAW；时区：`Asia/Shanghai`
- 首批短期观察：`600000.SH`、`000001.SZ`、`600519.SH`，跨沪深，3 只。

## 启用前检查

1. 在实际交易时段前确认 `/ready` 返回 `collectionPersistence=POSTGRES`。
2. 确认 Compose 中 `STOCKQUANT_SCHEDULER_WORKER=1` 和 `STOCKQUANT_COLLECTION_EXECUTOR=1`，且只有一个活动调度实例。
3. 为短期观察创建唯一订阅修订，记录 subscriptionId、revision、calendarVersion 和 testRunId。
4. 先运行 3 只证券连续 2 个实际交易日；每天检查盘中窗口、日终补采、来源尝试、质量问题和未解释缺口。
5. 短期观察通过后，使用上面的 20 只集合运行至少 1 个实际交易日，再进入 DC-08B 累积。

## 当前未完成项

- 尚未在交易时段启用正式调度；盘中延迟、持续更新和恢复仍为 `NOT_RUN`。
- 20 只集合尚未产生新的真实采集 Artifact；历史 58 日样本不能替代连续 60 日观察。
- 外部告警/异机灾备仍属于上线前生产就绪事项。
