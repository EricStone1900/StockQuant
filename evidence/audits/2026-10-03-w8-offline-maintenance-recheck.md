# W8 离线维护工程复核

时间：2026-10-03。范围：只验证本地集群配对备份、定时备份/留存安全逻辑，以及Ubuntu主机与服务Bearer候选值的本地预检。未运行正式备份、未连接活动数据库、未读凭据内容、未改变容器/卷/服务或调度。

## 验证结果

- `node --test scripts/cluster-paired-backup.test.mjs scripts/paired-backup.test.mjs scripts/scheduled-paired-backup.test.mjs scripts/backup-retention.test.mjs`：exit 0，21/21通过，0跳过。覆盖集群/角色清单漂移失败关闭、无密码角色元数据、隔离恢复证据、捕获中断、精确卷与quiescence门禁、写者恢复失败、独占锁、SIGTERM处理、verified archive校验和预览优先留存。
- `pnpm test:w8:ubuntu-host`：exit 0，4/4通过。
- `pnpm test:w8:service-bearers`：exit 0，3/3通过。
- `pnpm verify:w8:ubuntu-host`：exit 2，正确返回`BLOCKED`。宿主为macOS/aarch64，当前Docker runtime不可用；Ubuntu x86_64、目标资源阈值和目标主机授权均未满足。本机库存不构成Ubuntu发布或迁移证据。
- `git diff --check`：exit 0。

## 对W8门禁的影响

离线备份调度、留存安全和预检逻辑在当前工作树的复核通过，但这不改变正式活动集群配对备份、异地副本、恢复/RPO/RTO、维护窗口、活动Bearer轮换、Ubuntu部署及5个实际交易日观察的未完成状态。NO_TRADE及无线源授权边界保持不变。

本报告记录的是当前工作树测试结果；已有历史证据不作覆盖。代码/脚本引用的精确Hash由同名`.sha256`清单固定。
