# DC-04 主备数据源适配证据

验证日期：2026-09-12（Asia/Shanghai）。本证据覆盖受控 Python 适配器和故障切换逻辑；真实交易时段能力、正式许可和无人值守启用仍保持未完成。

## 实现

- `services/market-data-adapter/`：独立 Python 包，`pyproject.toml`、`uv.lock`及带哈希`requirements.lock`固定`baostock==0.9.3`、`requests==2.32.5`和传递依赖；镜像构建期安装，不在每次任务执行时下载。
- `providers.py`：BaoStock 子进程隔离和超时回收；兼容 BaoStock 旧版 `HHMMSS` 与 0.9.3 的 `YYYYMMDDHHMMSSmmm` 时间字段；Sina JSONP 解析；东方财富公开 JSON K 线解析；公共代码正确转换为 BaoStock `sh.600000`/新浪 `sh600000`/东方财富 `1.600000` 格式，并按请求本地日期过滤滚动结果；三者统一为明确的 OHLCV、amount、RAW 复权和来源字段，东方财富成交量手数转换为股。
- `failover.py`：每源独立限流、最多 3 次有限重试、退避、连续 3 次失败熔断 5 分钟、单探针半开恢复和来源切换审计；顺序为 BaoStock→Sina→Eastmoney。
- 空结果、缺字段、来源标识不一致均拒绝，不用 close×volume 伪造成交额。

## 自动验证

```bash
cd services/market-data-adapter
PYTHONPATH=src python3 -m unittest discover -s tests -v
cd ../..
pnpm --filter @stockquant/market-data-service lint
```

结果：当前实现 Python unittest 32/32通过；market-data-service TypeScript typecheck通过；语法编译检查通过。测试覆盖 BaoStock/Sina/Eastmoney 规范化、BaoStock 新旧时间字段、分页游标推进、代码转换、Sina JSONP、Eastmoney JSON、主源超时后切换备用、熔断冷却与半开恢复、空结果/字段不匹配隔离，以及 BaoStock 原始错误码保留。

## 真实盘后探针（不写库）

2026-09-12 对 `600000.SH`、`000001.SZ`、`600519.SH` 请求 2026-09-11 的5分钟历史数据，单源单次15秒上限。BaoStock在15秒内`TIMEOUT`；Sina备用成功返回144条规范记录（3只×48条），并在审计中保留两次尝试。该结果只证明盘后历史回溯及故障切换可用；没有在盘中观测更新/延迟，不能替代DC-T19。

## 未完成门槛

DC-04 当前为 `IN_PROGRESS`。BaoStock/Sina 的真实盘中两日能力、许可核验、实际限频和 DC-T19 仍需在交易时段执行；真实源能力不以 Fixture 或模拟故障测试替代。正式 Worker 在冻结订阅和DC-00能力报告前保持显式禁用。

状态校准（2026-09-17）：20 只订阅已完成一次收盘后真实采集（Sina 960/960），但这不替代盘中两日能力、BaoStock 盘中稳定性和许可核验；正式验收门槛仍为 `IN_PROGRESS`。

2026-09-19 东方财富适配器接入：新增直接公开 JSON 端点的只读最后备用适配器，未引入 AKShare；单元测试和类型检查通过。当前本机直接端点请求出现间歇性断连，尚未取得稳定盘中、60 个交易日覆盖或许可证据，因此来源状态保持候选/未通过，不改变正式验收门槛。

2026-09-20 BaoStock 超时复核与修复：稳定性探针原先只调用 `query.next()`、未调用 `get_row_data()`，导致每个查询停在第一条记录并被父进程误判为 `TIMEOUT`；现已修正并隔离 SDK 的登录/登出 stdout。两轮×三证券、2024-01-02 至 2024-03-29 的 6 次查询和一次恢复探针均 `SUCCESS`，每次 2,784 条，证据文件为本机忽略路径 `evidence/local/V2.5/baostock-stability-probe-20260920.json`。正式适配器容器查询同一窗口返回 2,784 条，来源健康状态已刷新为 `CLOSED / failures=0`。

2026-09-20 时间字段修复：BaoStock 0.9.3 返回的 `20240102093500000` 已按内嵌日期时间解析为 `2024-01-02T09:35:00+08:00`，并保留旧版六位 `HHMMSS` 兼容；能力探针三证券均 `PASS`，liveSession 仍为 `NOT_RUN`。长期限频、实际交易时段和人工验收门禁保持未签署。
