# P0 活动基线只读复核（2026-09-27）

复核时间：2026-09-26 17:18 UTC（2026-09-27 01:18 Asia/Shanghai）。范围：活动 V12 容器健康、Paper/API 观察、DC-08A 本地归档、自动任务状态、版本/锁指纹。仅执行 GET、`--check-only`、元数据读取和本地 Hash；没有启动/停止/重启服务、调用采集任务、写数据库、更新报告或更改自动任务。

## 代码与运行基线

- Git HEAD：`3282ee648dc3afcff5f2eee7734877b4cbb22230`；工作区存在大量未提交更改，HEAD 不代表当前运行源。
- Docker server：Linux/aarch64。13 个 `stockquant-v12-*` 容器均为 running；所有有 healthcheck 的服务均 healthy。Platform `/ready` 返回 `ready`, `brokerMode=FAKE`。本次只读检查没有重启容器。
- 关键活动镜像ID：Platform API `sha256:2d3b6d1c18fd2b190adbad5491ca00e8c09fdc0a87f682f5e96857ef3ad05709`；Portfolio Risk `sha256:d23d340fa21f0abe708ed926c205d46b0db0b7c0fd56079afa53eac71646a003`；Market Data `sha256:91c0a1690305167210705da98ef44c65caf87c6ea95efd088de33105191e83d5`；Qlib Worker `sha256:4135861adbf3617ae1b2e578caf7d2eb3f3835e0f5f42cf257b7a0d7b6991094`；PostgreSQL `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`。完整容器清单见本次只读 Docker inspect 输出。
- `services/quant-research-service/qlib-worker-requirements.lock` SHA-256：`9ce9eaff66f62acc6d63e583012f47e1585ae5a231f9e3661ae829fd638bdc8a`；`pnpm-lock.yaml` SHA-256：`7b29a3b505893d9ca880b86fc05e17b3072bb62db0ebb52f41264068750ca1f8`。

## 观察与调度

- `pnpm v24:preflight`：exit 0。Platform、Market Data、V2.4 scheduler、日历及 quote preview HTTP 检查均返回 200；这是可达性检查，不代表行情新鲜或增加观察日。
- V2.4 Paper API：`WAITING`，8/20，剩余12日；已计入日期为 2026-09-15～18、09-21～24。最新已结束日期 2026-09-25 被当前上交所日历标记 `CLOSED`，未计数。调度器 `RUNNING`、30分钟；`lastSampleAt=2026-09-25T07:10:00.007Z`，`nextSampleAt=2026-09-28T01:30:00.000Z`，tickCount=194。
- 当次 quote preview 的三只样例 `observedAt` 在 2026-09-24 16:14 +08 左右，虽然接口返回 `LIVE_SOURCE`，其时间是历史行情；非交易日的预检不构成新鲜度/交易时段证据。
- DC-08A 是另一条长期采集门槛：本地 `evidence/dc08a/observation-summary.json` 为 `dc08a-20260917-20-v1`，4个稳定完整日+1个恢复后完整日=5/20，剩余15日，`WAITING`；报告截至9月25日。文件 SHA-256=`357d761516c9946d48f21b1d8ab77e88fe1693ef85196f8c50d2b619513d07fb`。此数与 V2.4 Paper 8/20 不相加，旧归档仍按旧规则保留；新观察质量规则的逐日重验仍待。
- `pnpm dc08a:supervise -- --check-only`：exit 0、`HEALTHY`、actions为空；当前 Market Data readiness 报告20只 SecurityId、PostgreSQL持久化、scheduler worker与executor均启用。
- `pnpm dc08a:verify-automation`：exit 0。晨间守卫、DC-08A一次性/每日任务和两个 TDX 工作日任务显示 ACTIVE；两个 legacy/one-shot 项显示 PAUSED。任务未修改。
- 命令输出支持状态读取，但未对活动 PostgreSQL逐行审计所有订阅/租约；不把 endpoint readiness 当作数据库全量一致性证明。

## 判定与后续

本次只读复核没有增加自然交易日或改变两个计数。下一轮市场开放后的调度预计从 2026-09-28 09:30（北京时间）开始；是否生成有效样本取决于当时来源、时间戳和规则断言，不能预先视为完成。继续推进独立工程切片，不触发正式采集、不回填观察、不覆盖归档摘要。
