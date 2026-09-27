# V2.5 在线监控池 50/80/100 容量复验（2026-09-26）

## 结果

执行现有`pnpm v25:monitor-capacity`脚本，使用只读挂载的临时Node 24.1.0 ARM64侧车，并共享活动Market Data容器的网络命名空间，访问真实服务本地回环端口。测试目标是服务现有`/v2/watchlist`与`/v2/quote/preview`路径，没有重启或重建任何活动容器。

探针使用`source=tencent-quote`的`LIVE_SOURCE`报价状态，依次将在线监控池设置为50、80、100只；每次configuredCount、sampledCount、liveCount均与请求大小一致，状态全部为`LIVE_SOURCE`，service max=100。

| 证券数 | 已配置 | 返回样本 | LIVE_SOURCE | elapsed ms | 结果 |
|---:|---:|---:|---:|---:|---|
| 50 | 50 | 50 | 50 | 58 | PASS |
| 80 | 80 | 80 | 80 | 61 | PASS |
| 100 | 100 | 100 | 100 | 64 | PASS |

## 状态恢复与证据边界

- 探针开始前在线watchlist为`600000.SH`、`000001.SZ`、`600519.SH`，共3只。脚本现于`finally`恢复并立即逐项核对原列表和计数；结束后独立GET读回完全相同的3只。Market Data的持久采集证券集合前后均为冻结的20只，无改动。
- 开始时项目日历将2026-09-26标为`CLOSED`；调度器下一执行仍为`2026-09-28T01:37:00Z`（北京时间09:37），完成后再次GET保持同一时刻，期间无提交任务。只读状态核对表明Market Data、PostgreSQL健康。
- 临时侧车以`--rm`退出并已清理；V12 Market Data和PostgreSQL均保持原容器运行。无历史回放、真实券商、模型或写数据库操作。
- 该脚本在收盘后以来源状态标签计数，不验证quote `observedAt`新鲜度、盘中延迟、采集计划完整性或交易时段稳定性。它证明当前部署在线watchlist/quote接口的50/80/100规模响应及回滚，不代表全天候容量、第二来源能力或历史全市场吞吐。
