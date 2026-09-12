# DC-07 部署与故障演练证据

验证日期：2026-09-12（Asia/Shanghai）。本次包含 Mac ARM64 Docker Compose 实测；Ubuntu 实机人工验证已由用户确认通过。按计划1.2，本证据仅证明本机单机交付；外部告警出口、异机灾备和生产运行手册延期至上线前。真实交易日短期运行由DC-08A独立验收，尚未完成。

## 执行入口

```bash
pnpm dc07:verify
```

脚本执行 Compose 配置校验、服务健康状态检查、market-data-service 重启恢复、PostgreSQL custom-format 备份、隔离数据库恢复和恢复后表数量核对。备份临时目录为 `/tmp/stockquant-dc07`，不属于正式数据目录。

## 最终结果

- Compose 配置：PASS。
- 健康状态：PostgreSQL、market-data-service、platform-api-service 及其余已部署服务均 healthy 或正常运行。
- 重启恢复：market-data-service 重启后约 `12.053s` 恢复 `/ready`，持久化模式仍为 `POSTGRES`。
- 资源限制：market-data-service `cpus=1.0`、`mem_limit=1g`；Mac 实际容器架构 `arm64`。
- Ubuntu 实机：用户人工验证通过；具体主机、镜像摘要、资源读数和命令应由部署记录补充，不能用 Mac 结果替代。
- 告警 Outbox：真实 PostgreSQL 集成测试验证告警键去重、失败保留、退避重试和成功确认；11/11 集成测试通过。外部通知未配置时只保留本地持久状态，不声称已发送。
- 备份：`/tmp/stockquant-dc07/market_data.dump`，`57,639` bytes，SHA-256 `60b939b3cdbaa8c9ef49d27fee39a35b5d05c1023b10f102c21729594c7d1370`。
- 隔离恢复：恢复数据库 `dc07_restore_1789201806644`，核对 public 表 `20` 张，PASS；验证完成后仅删除该临时恢复库。
- 平台存活检查：`GET http://127.0.0.1:3000/live` 返回 200。

## 保留的失败记录

1. 初次运行发现已运行的旧 market-data 镜像缺少 `collectionPersistence=POSTGRES`，确认部署镜像漂移；重建并强制重建服务后通过。
2. 第二次运行发现验证脚本将二进制 dump 按 UTF-8 传输，隔离恢复报告 EOF；修复为 Buffer 传输后重新执行并通过。

## 尚未完成门槛

DC-07 为 `DONE（本机范围）`：本机容器、重启恢复、资源限制、持久告警 Outbox、备份/隔离恢复以及 Ubuntu 实机人工验证已通过。外部告警出口真实故障/恢复、宿主机重启续跑、异机备份和生产操作手册属于上线前生产就绪事项，不在本机单机交付内；实际交易日采集由DC-08A单独保持未完成。
