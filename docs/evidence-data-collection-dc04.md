# DC-04 主备数据源适配证据

验证日期：2026-09-12（Asia/Shanghai）。本证据覆盖受控 Python 适配器和故障切换逻辑；真实交易时段能力、正式许可和无人值守启用仍保持未完成。

## 实现

- `services/market-data-adapter/`：独立 Python 包，`pyproject.toml`、`uv.lock`及带哈希`requirements.lock`固定`baostock==0.8.9`和传递依赖；镜像构建期安装，不在每次任务执行时下载。
- `providers.py`：BaoStock 子进程隔离和超时回收；Sina JSONP 解析；公共代码正确转换为 BaoStock `sh.600000`/新浪 `sh600000` 格式，并按请求本地日期过滤滚动结果；两者统一为明确的 OHLCV、amount、RAW 复权和来源字段。
- `failover.py`：每源独立限流、最多 3 次有限重试、退避、连续 3 次失败熔断 5 分钟、单探针半开恢复和来源切换审计。
- 空结果、缺字段、来源标识不一致均拒绝，不用 close×volume 伪造成交额。

## 自动验证

```bash
cd services/market-data-adapter
PYTHONPATH=src python3 -m unittest discover -s tests -v
cd ../..
pnpm --filter @stockquant/market-data-service lint
```

结果：Python 测试6/6通过；TypeScript检查通过；market-data Linux ARM64 容器构建通过，容器内`import market_data_adapter.cli`通过。测试覆盖 BaoStock/Sina 规范化、代码转换、Sina JSONP、主源超时后切换备用、熔断冷却与半开恢复、空结果/字段不匹配隔离。

## 真实盘后探针（不写库）

2026-09-12 对 `600000.SH`、`000001.SZ`、`600519.SH` 请求 2026-09-11 的5分钟历史数据，单源单次15秒上限。BaoStock在15秒内`TIMEOUT`；Sina备用成功返回144条规范记录（3只×48条），并在审计中保留两次尝试。该结果只证明盘后历史回溯及故障切换可用；没有在盘中观测更新/延迟，不能替代DC-T19。

## 未完成门槛

DC-04 当前为 `IN_PROGRESS`。BaoStock/Sina 的真实盘中两日能力、许可核验、实际限频和 DC-T19 仍需在交易时段执行；真实源能力不以 Fixture 或模拟故障测试替代。正式 Worker 在冻结订阅和DC-00能力报告前保持显式禁用。
