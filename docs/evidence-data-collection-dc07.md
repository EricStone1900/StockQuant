# DC-07 部署与故障演练证据

验证日期：2026-09-12（Asia/Shanghai）。本次为 Mac ARM64 Docker Compose 实测；Ubuntu 实机、外部告警出口和真实交易日短期运行仍未替代验证。

## 执行入口

```bash
pnpm dc07:verify
```

脚本执行 Compose 配置校验、服务健康状态检查、market-data-service 重启恢复、PostgreSQL custom-format 备份、隔离数据库恢复和恢复后表数量核对。备份临时目录为 `/tmp/stockquant-dc07`，不属于正式数据目录。

## 最终结果

- Compose 配置：PASS。
- 健康状态：PostgreSQL、market-data-service、platform-api-service 及其余已部署服务均 healthy 或正常运行。
- 重启恢复：market-data-service 重启后约 `12.053s` 恢复 `/ready`，持久化模式仍为 `POSTGRES`。
- 资源限制：market-data-service `cpus=1.0`、`mem_limit=1g`；实际容器架构 `arm64`。
- 备份：`/tmp/stockquant-dc07/market_data.dump`，`53,750` bytes，SHA-256 `5c02dd01cb761c0f0ccf2e404c8e9618ff554bab6aa562becb11df310b5db870`。
- 隔离恢复：恢复数据库 `dc07_restore_1789201598230`，核对 public 表 `19` 张，PASS；验证完成后仅删除该临时恢复库。
- 平台存活检查：`GET http://127.0.0.1:3000/live` 返回 200。

## 保留的失败记录

1. 初次运行发现已运行的旧 market-data 镜像缺少 `collectionPersistence=POSTGRES`，确认部署镜像漂移；重建并强制重建服务后通过。
2. 第二次运行发现验证脚本将二进制 dump 按 UTF-8 传输，隔离恢复报告 EOF；修复为 Buffer 传输后重新执行并通过。

## 尚未完成门槛

DC-07 仍为 `IN_PROGRESS`：本机容器、重启恢复、资源限制、备份/隔离恢复已通过；目标 Ubuntu 实机、告警出口故障/恢复、宿主机重启续跑和实际交易日采集尚未完成。操作手册在这些证据补齐前保持 `DRAFT_NOT_EXECUTABLE`。
