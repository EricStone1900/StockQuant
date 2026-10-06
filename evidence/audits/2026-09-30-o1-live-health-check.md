# O1 实时健康只读复核

时间：2026-09-30 08:29:57Z（Asia/Shanghai 16:29:57）。

执行 `pnpm dc08a:health-report`，退出码 0。普通沙箱首次执行无法访问 `127.0.0.1:3002`，未写出报告；在获准的受限提升环境中再次执行同一只读脚本成功，更新了最新快照 [`evidence/dc08a/health-report.json`](../dc08a/health-report.json)。脚本仅对本机 Market Data API 发起 `/ready`、scheduler status、source metadata、collection health 和日历 GET；没有调用行情拉取/探测端点，也没有写入业务数据库。

报告结论：`HEALTHY`；Market Data readiness 为 `ready`，PostgreSQL 持久化、scheduler、executor 均为 ENABLED；最近 Tick 为 `08:29:01Z`，年龄约 56 秒；下一次计划触发 `2026-10-08T01:37:00Z`；open gaps 和 pending outbox 均为 0。报告处于收盘后状态 `AFTER_CLOSE`，因此不要求此刻来源新鲜度。

同轮 Docker 只读清单显示 Market Data 容器 `stockquant-v12-market-data-service-1` 为 Up/healthy，端口映射仍为 `127.0.0.1:3002`；Platform API `stockquant-v12-platform-api-service-1` 为 Up/unhealthy（端口 3000），其余原有容器未作操作。此 Platform 状态需与 DC-08A Market Data 健康结论分开跟踪；本次没有启动、停止、重启、构建或删除容器，也未改动卷。该健康快照不增加 O1c 观察日，不关闭 O1a/O1b、O2、W3 或 Ubuntu 观察门禁。

08:31:54Z再次只读检查 Platform API Docker health state：仍为 `unhealthy`，最近5次检查均 exit 1，Docker health output 为空。此检查不能单独证实根因；未读取容器日志或环境变量，亦未尝试重启/修复。

08:33Z对相同 `/ready` GET 取得 HTTP 503，响应仅含通用 `required dependency is unavailable`，不泄露细节。当前工作树的 Platform readiness 实现会检查 bearer 配置、PostgreSQL及 Portfolio、Trade Execution、Historical Replay 依赖，但活动容器镜像无法由当前工作树直接代表；故本次未进一步断言单一根因。该活动容器仍需后续批准的部署/维护方案处理。

本次后续工作树清单：[O1健康快照Manifest](./2026-09-30-o1-health-content-manifest.sha256)，覆盖4446个Git已跟踪及未忽略未跟踪文件，SHA-256为`5b36d84ea95b66441697f1151be32f103f8ee7cca40a3ed84a4ab691c316059e`；排除本清单与本审计，忽略文件及秘密配置不纳入。
