# P0 活动观察只读复核（2026-09-27 03:52 Asia/Shanghai）

复核时间：2026-09-26 19:52 UTC。完整精简响应保存在[JSON记录](./2026-09-27-p0-live-baseline-recheck-2.json)。只执行 HTTP GET、活动订阅读取、已有本地观察摘要读取及守卫 `--check-only`；没有 tick、启动采集、写数据库、重启服务、下单或修改历史观察。

`pnpm dc08a:supervise -- --check-only` 与 `pnpm v24:preflight` 均退出 0。Platform 为 `ready/FAKE`，Market Data 为 `ready/POSTGRES`，20只采集证券、Scheduler Worker与Executor已启用；当前仅发现活动订阅 `dc08a-20260917-20-v1`。Paper API返回 `WAITING`、8/20、剩余12日，已计入日期为9月15–18日和21–24日；9月25日被标记`CLOSED`且未计数。调度器为`RUNNING`，下一采样时间为9月28日09:30（北京时间）。

DC-08A归档摘要仍为4个稳定日＋1个恢复日，共5/20、剩余15日，摘要Hash与前次审计一致：`357d761516c9946d48f21b1d8ab77e88fe1693ef85196f8c50d2b619513d07fb`。quote preview三证券的`observedAt`仍为9月24日；本次为周末/休市日，HTTP可达与`LIVE_SOURCE`标签不构成新鲜盘中行情或观察日证据。两个20日计数属于独立门槛，不相加。

结论：与前次快照相比未出现新的合格交易日；保留8/20与5/20及其原始历史，不回填日期。9月28日预定采样仍须按实时来源、采样窗口、逐证券新鲜度及日终质量规则判断，不能预先计为有效。
