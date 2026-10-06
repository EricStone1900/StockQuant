# DC-08A 定时任务误报修复记录（2026-09-29）

状态：已实现并完成脚本级验证；实际交易日观察待运行，不计入 V2.4 人工验收或 20 日观察门禁。

## 目标与边界

本次修复仅调整 DC-08A 的采集运维判断与 Codex 自动化编排。保持活动订阅
`dc08a-20260917-20-v1`、20 只证券、现有来源顺序和 FakeBroker 设置不变；不创建
采集运行、不重置缺口或观察记录，不启用 LIVE。

## 已实施

1. `dc08a:eod` 在交易日 15:15（最后一个五分钟窗口及 300 秒完成期限之后）前返回
   `WAITING_END_OF_DAY`，不会执行覆盖率写入、归档或观察计数。非交易日返回 `NOT_RUN`。
   同一交易日的并发日终调用使用本地互斥锁；完成前的重复调用返回
   `EOD_ALREADY_RUNNING`。
2. 覆盖率完成期限由发布延迟 120 秒、调度轮询 60 秒、执行轮询 60 秒和有界
   拉取/持久化余量 60 秒组成，默认 300 秒。提前到达但尚未到期的合法 Bar 不再记为
   `unexpected` 或建立缺口。
3. 健康报告将调度 Tick 与来源新鲜度分开；09:30 与 13:00 的首个窗口完成期限前显示
   `WAITING_INITIAL_WINDOW`，不把上一时段来源时间当作故障。
4. 心跳 `a-20` 只运行 `dc08a:monitor` 及只读汇总；独立的 `dc-08a-2` 继续在 15:20
   运行日终。TDX 上午和收盘观察改用 `v25:tdx-preflight`，它只读取 A 股日历，避免
   不相关的 V2.4 页面或行情预检阻断探测。
5. TDX 探测证据新增脱敏的 `failure` 分类。`TCP_PERMISSION_DENIED` 标记为
   `EXECUTION_ENVIRONMENT`；任务在同一环境不得重复探测，只有执行权限边界变化后才可
   进行一次有界复测。

## 已验证

在仓库根目录执行：

```bash
node --test scripts/data-coverage.test.mjs scripts/dc08a-operations.test.mjs scripts/dc08a-health-report.test.mjs scripts/v24-preflight.test.mjs scripts/tdx-preflight.test.mjs
UV_CACHE_DIR="$PWD/.uv-cache" uv run --project services/market-data-adapter --frozen pytest services/market-data-adapter/tests/test_probe_tdx_script.py -o addopts=''
pnpm dc08a:verify-automation
git diff --check
```

2026-09-29 的结果：Node 36/36 通过、Python 7/7 通过、自动化配置 PASS、差异检查通过。

## 后续真实观察

在至少两个实际交易日中确认：上午与午后首窗口不再产生误报；15:20 日终仅运行一次并在
完整 48 个窗口后计数；真正超时或重复 Bar 仍会建立相应缺口；TDX 任务会将权限阻塞与
来源故障区分记录。保留新旧证据，不回写或重算已有观察日。

## TDX 权限边界复核（2026-09-30）

受限命令沙箱访问 `127.0.0.1:3002` 时返回 `EPERM`，但经精确、一次性的受控本机网络权限
重跑 `pnpm v25:tdx-preflight` 后返回 `READY`。这证明该错误是沙箱本地网络策略，而不是
Market Data 服务不可用。

随后在同一受控环境对冻结的 20 只证券、已完成的 2026-09-29 交易日运行全时段只读 TDX
探测：`PASS`，960/960 根 Bar，48 根/证券，无缺失、重复、异常或非预期 Bar；TDX 服务器
`121.36.248.138`，连接延迟 655.09 ms，结果 SHA-256 为
`fb839ad8f0856cdb324ea99b9cdb4dfddcbf596500615f8b2b683e609944ee66`。证据文件为
`evidence/dc08a/dc-t19/2026-09-30/tdx-capability-recheck-2026-09-29.json`。

TDX 上午和收盘自动化现在会在出现该精确 `EPERM` 时，仅为同一个前置检查或固定探测请求
一次受控网络权限后重跑；仍失败则保留退出码 2，不更换来源、不扩大范围、不重复重试。
