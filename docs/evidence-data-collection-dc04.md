# DC-04 主备数据源适配证据

验证日期：2026-09-12（Asia/Shanghai）。本证据覆盖受控 Python 适配器和故障切换逻辑；真实交易时段能力、正式许可和无人值守启用仍保持未完成。

## 实现

- `services/market-data-adapter/`：独立 Python 包，`pyproject.toml` 锁定运行边界；BaoStock 可选依赖独立安装，不在每次任务执行时下载。
- `providers.py`：BaoStock 子进程隔离和超时回收；Sina JSONP 解析；两者统一为明确的 OHLCV、amount、RAW 复权和来源字段。
- `failover.py`：每源独立限流、最多 3 次有限重试、退避、连续 3 次失败熔断 5 分钟、单探针半开恢复和来源切换审计。
- 空结果、缺字段、来源标识不一致均拒绝，不用 close×volume 伪造成交额。

## 自动验证

```bash
cd services/market-data-adapter
PYTHONPATH=src python3 -m unittest discover -s tests -v
cd ../..
pnpm --filter @stockquant/market-data-service lint
```

结果：Python 测试 5/5 通过；TypeScript 检查通过。测试覆盖 BaoStock/Sina 规范化、Sina JSONP、主源超时后切换备用、熔断冷却与半开恢复、空结果/字段不匹配隔离。

## 未完成门槛

DC-04 当前为 `IN_PROGRESS`。BaoStock/Sina 的真实盘中两日能力、许可核验、实际限频和 DC-T19 仍需在交易时段执行；真实源能力不以 Fixture 或模拟故障测试替代。正式 Worker 仍不得在未完成 DC-00/07 前启用。
