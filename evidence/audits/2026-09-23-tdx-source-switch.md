# TDX 候选来源切换审计（2026-09-23）

## 结论

`tdx` 已作为可选分钟数据适配器接入，但状态仍为 `CANDIDATE`。正式来源顺序仍是
`sina,baostock`，没有修改 `.env.local`、正式订阅、定时任务、数据库运行状态或 Artifact。
Ashare 未接入，因为它不是独立的传输来源，而是对新浪/腾讯接口的封装。

## 实现与依赖

- 适配器入口：`services/market-data-adapter`，新增 `TdxMinuteClient` 和 `normalize_tdx`。
- 时间语义：easy-tdx `MacClient` 的分钟线时间戳按收盘标签处理；`09:35` 规范化为
  `09:30`–`09:35`。请求条数限制为 48–800，沿用现有 JSON-lines、限频、熔断和来源审计边界。
- 依赖：`easy-tdx` Git commit `4820b4a0496899ece0b8ca4d7f4d66a5159da7f8`，通过
  Python 3.10+ 可选 extra 锁入 `uv.lock`；默认安装不加载此 extra。
- 服务器和连接延迟写入每次来源尝试的 `server` / `latencyMs` 字段；既有来源没有这些字段时
  不改变其尝试结构。

## 自动检查

在仓库根目录执行：

```text
cd services/market-data-adapter && UV_CACHE_DIR="$PWD/../../.uv-cache" uv run ruff check .
cd services/market-data-adapter && UV_CACHE_DIR="$PWD/../../.uv-cache" uv run mypy src
cd services/market-data-adapter && UV_CACHE_DIR="$PWD/../../.uv-cache" uv run pytest -q
pnpm typecheck
```

结果：ruff PASS、mypy PASS、适配器 `48 passed`、全仓 typecheck PASS；仓库入口
`pnpm v25:probe-tdx -- --start-date 2026-09-23 --end-date 2026-09-23` 也返回 `PASS`。

## 真实只读能力探针

命令：

```text
UV_CACHE_DIR="$PWD/.uv-cache" uv run --project services/market-data-adapter --extra tdx --frozen \
  python scripts/probe-tdx-minute-capability.py \
  --start-date 2026-09-23 --end-date 2026-09-23 \
  --output /tmp/stockquant-tdx-capability-20260923.json
```

结果：`PASS`，`adapterExitCode=0`，3只证券（`600000.SH`、`000001.SZ`、`600519.SH`）
共144根5分钟Bar；实际服务器 `121.37.207.165`，连接延迟约 `330.43ms`，结果 Hash 为
`12ae2df345ae6939568b55a700ea8a2d24bc14bb7a32ab96354240441d2ff0ef`。探针只调用适配器读边界，
不创建采集运行、不写数据库、不发布 Artifact、不改变正式来源熔断状态。

另一次 easy-tdx 标准服务器 ping 曾返回“连接被服务器关闭”；该失败仅记录为候选服务器探测
失败，不能推导所有 TDX 服务器不可用。实际适配器随后从上述服务器完成只读探针。

同日盘后还执行了20只证券批量烟测：`PASS`、`adapterExitCode=0`、`960` 根 Bar，服务器
`123.60.47.136`，连接延迟约 `336.001ms`，结果 Hash 为
`826b8f6689376ceda42410e5f211be0c18f4e003dc3d1f9110ed4addfee10c38`。该结果只证明批量
请求和分页边界可运行；由于不是交易时段，不能计入 DC-08A 的实际交易日观察。

## 尚未满足的切换门禁

- 至少两个实际交易日的连续观察：`NOT_RUN`。
- 20只证券的交易时段覆盖、48根窗口完整性和跨沪深一致性：`NOT_RUN`。
- 限频、断线恢复、来源切换和正式调度回放：`NOT_RUN`。
- 因此不能把本次单日3只证券 PASS 当作实时源正式启用证据，也不能改变 V2.4 7/20 或
  DC-08A 4/20 的既有门禁状态。
