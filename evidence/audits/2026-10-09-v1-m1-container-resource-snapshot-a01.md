# V1 Mac M1 与隔离故障E2E资源快照

日期：2026-10-09。用途：记录当前Mac M1宿主与Docker Desktop额度，以及一次V1.5 Platform Worker故障接管E2E期间实际容器采样。此记录是固定小样本场景的环境证据，不是容量基准、持续峰值测量、Ubuntu证据或V1版本验收。

## 宿主和Docker额度

| 指标 | 实测值 |
|---|---|
| macOS CPU型号 / 架构 | Apple M1 Max / arm64 |
| 宿主内存 | 34,359,738,368 bytes（32 GiB） |
| 仓库所在卷快照 | 460 GiB总量、325 GiB已用、114 GiB可用、75% |
| Docker Desktop | 28.0.4，Linux daemon，aarch64，10 vCPU，8,218,034,176 bytes（约7.65 GiB）内存 |
| Docker根目录 | `/var/lib/docker`（daemon内部路径） |
| daemon全局Docker磁盘快照 | images 59.72 GB；volumes 9.16 GB；build cache 21.37 GB；containers 6.129 MB |

宿主CPU/内存通过只读`sysctl`读取，daemon额度通过`docker info`读取；仓库卷用`df -h .`读取，Docker全局磁盘汇总用`docker system df`读取。磁盘数据是快照；Docker汇总属于共享daemon全局值，不拆分为本E2E占用。本次没有清理共享缓存、镜像或卷。

## E2E容器采样

命令：`STOCKQUANT_V15_E2E_WORKER_FAILOVER=true pnpm test:e2e -- --stage V1.5`。运行在随机隔离项目`sq-v15-e2e-b6acdc61a83420710d8a`，Platform备用Worker接管模式；normal/AUTO/rejection/recovery Web/API/CLI/export流程运行，浏览器3/3通过，最终状态PASS，外部数据源/真实券商调用均为0，随机容器、卷、网络精确清理。

`docker stats --no-stream`约每5秒采样，记录113行容器观察。表中为各容器已采样的最大CPU百分比/内存使用量；Docker没有为这些服务设置CPU quota，CPU百分比可超过100%。这些是间歇快照的最大值，不保证捕获瞬时绝对峰值。

| 容器 | 样本数 | 采样最大CPU | 采样最大内存 |
|---|---:|---:|---:|
| Platform API | 10 | 91.31% | 285.4 MiB |
| Platform备用Worker | 9 | 138.60% | 265.4 MiB |
| Trade Execution | 11 | 9.30% | 24.84 MiB |
| Portfolio Risk | 14 | 26.26% | 60.23 MiB |
| Decision Governance | 12 | 7.49% | 27.41 MiB |
| Quant Research | 12 | 5.73% | 21.28 MiB |
| PostgreSQL | 14 | 6.99% | 90.82 MiB |
| NATS | 11 | 0.70% | 6.438 MiB |
| Temporal | 11 | 11.12% | 94.89 MiB |
| Web | 9 | 14.00% | 48.08 MiB |

Playwright runner与宿主进程不在上述Docker容器CPU/内存表中。测试期间没有OS级统一峰值采样。此结果只适用于本次固定小样本、Mac ARM64 Linux容器和10 vCPU/约7.65 GiB Docker额度，不能外推完整市场数据容量、Ubuntu运行或生产资源需求。

## 原始证据

- E2E结构化报告：[JSON](./2026-10-09-v15-worker-failover-sq-v15-e2e-b6acdc61a83420710d8a.json)，SHA-256 `cf6281ed06976e0e3cbd1533fe562aaea573a3a32ed70f4ea24958625d51bed4`
- E2E完整命令日志：[日志](./2026-10-09-v15-worker-failover-resource-sample-e2e-a01.log)，SHA-256 `4f97563f27006992d2b85434f74db46fae64ea4f4f3667acc8decf179e6d69a5`
- 原始间隔采样：[CSV](./2026-10-09-v15-worker-failover-resource-sample-a01.csv)，SHA-256 `9cc608d8b012a957263666ee0f496cd97a20a73b4b649d3edf13b79a392b1a0d`
