# P6 每日分区容量与 V2.2 代码套件复验（2026-09-26）

## 完成情况

仓储层容量烟测见[详细记录](./2026-09-26-p6-minute-capacity-smokes.md)：100,000行与合成的1,440,000行负载均使用隔离随机PostgreSQL数据库，验证流式发布、精确计数、时间范围分页和目标日分区裁剪，烟测确认数据库删除。1.44M档耗时39,224ms，36,712 rows/s，Node峰值RSS 213,264 KiB，数据库尺寸增加899,104,768 bytes；输入是确定性合成Bar，不是冻结归档文件。

随后完整执行：

```bash
pnpm verify:stage -- --stage V2.2 --suite code
```

初次沙箱内运行因禁止连接本机隔离数据库而退出2；启动仓库已有的PostgreSQL服务后，在获准访问`127.0.0.1:5433`的执行上下文中重跑通过。未重建数据库卷或执行活动服务部署。最终检查包括：

- Markdown链接623条，无失败；75 JSON、41 schemas、26契约fixtures、30兼容消费者规则及15份冻结Fixture Hash均通过。
- 全仓build、lint、typecheck及单测通过；Market Data 49项单测。
- Trade/Portfolio隔离数据库和HTTP身份验证、P5.7丢响应/重启恢复通过。
- Python Market Data Adapter 58项通过；运维脚本94项通过。
- Market Data隔离PostgreSQL集成22/22通过，含分区裁剪与历史回填CLI预览/应用/重跑；CLI smoke插入1行，幂等重试插入0行，分页返回1行。
- 1.44M仓储层容量脚本独立完成并确认清理随机测试库。

## 状态边界

该代码套件PASS和容量smoke只构成工程验证；V2.2整体观察、完整CSV/Parquet真实归档文件→HTTP的容量与恢复、生产/Ubuntu资源限制、并发、历史旧表回填、备份恢复和人工验收仍未完成。不得将V2.2整体标为PASS或修改既有人工签署。
