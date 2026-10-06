# W1 / V1.1 旧非终态 Run 迁移门禁加固

发现：活动 legacy 表仍有 2 条 `RUNNING` 和 1 条 `WAITING` 记录，均早于24小时。原迁移入口只拒绝最近24小时内的非终态，虽与维护Runbook要求负责人先处置全部未完成Run不一致，但仍可能迁移这些旧状态。

修改：迁移入口改为统计全部 `QUEUED`/`RUNNING`/`WAITING` legacy记录；只要计数非零就拒绝迁移，须由操作负责人先明确处置并留证。没有针对活动数据库运行迁移，也没有修改Run状态、停服务或清理历史记录。增加单测覆盖3条陈旧非终态拒绝。

验证：Platform API TypeScript typecheck退出0；`v11-legacy-migration-preflight.spec.ts` 4/4通过；Platform API全量49个单测文件/180项测试通过；迁移脚本 `node --check` 退出0。完整输出见本目录 `*-typecheck.log`、`*-unit.log`、`*-platform-unit.log`、`*-script-check.log`。修改同步到Platform API、V1.1阶段文档及切换Runbook；人工处置和活动切换/回退仍未完成。
