# V2本地学习版：使用与恢复入口

本文件对应[V2本地学习版范围](../../decisions/2026-10-29-v2-local-learning-version-scope.md)，当前为候选准备资料，整版签收未完成。适用Mac本地个人学习和FakeBroker模拟；真实市场PIT/模型质量、正式连续Paper与20日观察、全市场分钟容量及备用源均按决定记录为未完成或延期。

## 使用入口

使用仓库固定Node `24.1.0`、pnpm `10.34.5`和Docker Desktop。依赖按`pnpm install --frozen-lockfile`安装；不要提交`.env`或真实凭证。默认配置见根目录`.env.example`：`PAPER`、`FAKE`、`STOCKQUANT_LIVE_TRADING_ENABLED=false`，外部行情源和自动启动的独立开关保持默认关闭。用户自有数据只能按其已记录的用途、保留期和来源边界使用。

各功能使用经各自阶段实测的第8节，不把不同阶段隔离栈的临时URL混用：

- [V2.1 在线池、行情和新闻](./01-free-data-and-news.md)：第8节提供隔离栈、固定输入、Web操作和同Run检查。
- [V2.2 分钟导入](./02-minute-data-import.md)：第8节提供导入、版本/质量和恢复步骤。
- [V2.3 历史回放和Qlib Fixture](./03-historical-minute-replay.md)：第8节及8.0的合成Fixture路径、限制和执行命令。
- [V2.4 C5本地工程](./04-continuous-paper-trading.md)：第8.7节提供本地Fixture工程纵切，正式活动来源和策略另有门禁。
- [V2.5 C6单源工程](./05-data-scale-and-v2-acceptance.md)：第8节和单源增量手册提供上传、排队、查询、排队取消和重启恢复。运行中任务不支持协作取消；跨设备任务检索未实现。

各隔离栈输出的Web/API地址和项目名为当次值，重新启动时重新读取；Web会话和Cookie仅本机使用。同Run `--check-only`只读取既有业务事实；证据导出和人工签收分别记录。

## 保存与恢复边界

Git源码不包含`.env`、`evidence/local/`、`data/local/`、本地数据库或实际数据卷。先单独保管必要的脱敏证据、真实数据及其适用范围记录；不得把数据或凭证推到远端。数据库、Artifact及其他事件/工作流存储属于独立持久状态，镜像或源码提交不能代替备份。

正式备份器入口为`pnpm backup:create`（[实现](../../../scripts/create-cluster-paired-backup.mjs)）。必须先核实目标Compose、精确Artifact卷、仅所有者可访问的备份目录，停止所有数据库写入者及Artifact发布者，然后使用脚本要求的`--confirm-writes-quiesced=cluster/<精确卷名>`；不得对活动卷执行盲目清理或覆盖。先在隔离环境验证备份和恢复，确认清单与Artifact哈希、关联业务事实及适用事件/工作流状态后再考虑实际恢复。[V1隔离备份恢复记录](../v1-local-simulation/05-scheduling-and-recovery.md)说明既有测试范围及未覆盖项；本候选尚未对实际用户数据、完整V2多服务同点恢复或异地恢复进行新演练。恢复目标、具体卷和维护窗口需在实际操作前按当前环境确认。

候选核验和已知限制见[收口核对](../../../evidence/audits/2026-10-29-v2-local-learning-candidate-review.md)；原V2完整版门禁仍由`pnpm verify:version -- --version V2`报告，不代表本地学习版验收结果。
