# DC-00 来源能力核验记录

核验时间：2026-09-12 14:28（Asia/Shanghai）；代码工作区未提交状态下执行；仅做只读查询，不发布数据、不启用定时任务。

## 执行命令

```bash
UV_CACHE_DIR="$PWD/.uv-cache" pnpm v25:probe-minute-sources -- \
  --codes sh.600000,sz.000001,sh.600519 \
  --start-date 2024-01-02 --end-date 2024-01-10 \
  --timeout-seconds 15 \
  --output /tmp/stockquant-dc00-capability.json
```

退出码：0；探针总体状态：`PASS`（历史访问能力）；`liveSession`：`NOT_RUN`，原因是执行时不在实际交易时段。

## 结果

| 来源 | 结果 | 实测内容 | 结论 |
|---|---|---|---|
| BaoStock | PASS | `sh.600000`、`sz.000001`、`sh.600519` 各336行；首条为2024-01-02 09:35，末条为2024-01-10 15:00；字段为date/time/code/open/high/low/close/volume/amount | 历史5分钟读取可用；此前长时间稳定性仍需独立观察 |
| 新浪 `CN_MarketDataService.getKLineData` | PASS | 三只证券各返回1,970行；当前窗口2026-07-16 14:55至2026-09-11 15:00；字段含day/open/high/low/close/volume/amount及均线字段 | 可读取近期5分钟数据并满足字段映射；本次范围约40个交易日，不能宣称60日覆盖 |
| 盘中持续更新 | NOT_RUN | 本次运行时间不在交易时段，未测发布延迟、窗口闭合及时性或盘中失败切换 | DC-00实时能力门槛保持未完成，禁止启用正式盘中定时任务 |

BaoStock 的3只查询单独会话耗时约7.2秒；新浪单只请求约0.44～0.49秒。耗时仅为本次探针观察，不能作为生产SLA。新浪返回的均线字段不进入规范分钟契约；规范层只消费明确的 OHLCV 及 amount 字段。

## 状态与后续

- DC-00历史能力：`PASS`。
- DC-00实时/盘中能力：`NOT_RUN`，下一次实际交易时段执行DC-T19/DC-T25所需观测。
- 严格60日第二来源：`NOT_AVAILABLE`（新浪本次约40日；BaoStock历史样本曾完成58实际交易日，但稳定性探针出现超时）。
- 来源策略暂定顺序：BaoStock 主源、Sina 备用；只有完成字段/单位/延迟/限频和许可复核后才能启用正式任务。
- 原始JSON结果保存于 `/tmp/stockquant-dc00-capability.json`，不作为长期项目证据；正式实现须将脱敏Artifact和SHA-256写入持久证据目录。
