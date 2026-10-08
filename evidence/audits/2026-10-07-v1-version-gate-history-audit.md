# V1版本门禁历史TestRun缺口复核

日期：2026-10-07（Asia/Shanghai）

运行命令：`pnpm verify:version -- --version V1`。第一次运行报告FAIL/exit 1：2份2026-10-06 V1.2源码Hash清单中的9项文件Hash与当前工作树不同。两份清单绑定的是历史执行输入，不能重写。对应V1.2阶段文档及V1总计划中的链接标签现均明确为“历史执行快照”；Verifier仅将这些引用按历史快照保留，不再错误地与当前源码比较。验证后的V1门禁恢复为INCOMPLETE/exit 2，阶段文件审计5/5 PASS、当前有效证据引用/Hash检查PASS（186 refs、12 current manifests、32 entries、0 failures）。原始Hash清单不变。

当前版本门禁仍有7条旧TestRun没有`evidence/local/<stage>/<testRunId>/evidence.json`结构化导出：V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`；V1.3 `39c9b7c0-080d-45d7-83cf-b8865f6a4b42`、`d1540cb1-d085-40bf-860d-43031951bd55`、`5a817c7f-64c0-4c8d-a979-97b44a38c80c`；V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`。审计器中唯一V1.2另一Run已有导出并通过。

逐项查找以上UUID的workspace docs/evidence/scripts/services，未发现对应结构化导出。Git所有本地refs按目标 evidence/local stage/run paths查询没有可恢复历史文件；此前门禁审计时本机Platform API不可达。2026-10-07后续复核中，`http://127.0.0.1:3000/api/v1/session`已返回`acceptance-owner-1`的LOCAL_DEVELOPMENT会话；对上述7个原UUID调用各自V1路由均返回HTTP 404，未写入或替换任何Run bundle。工作树内也未发现可用数据库dump。相关旧的验收表、版本摘要与历史门禁JSON只保留ID及其既有结论，不能替代精确Run事实、Manifest和用户签署。基于当前文件系统、Git历史、可见备份文件和活动本机API，这7条仍不可恢复，继续在Verifier里准确显示INCOMPLETE；若将来恢复原始数据库/备份，可重试原UUID导出。不得以新TestRun替换旧ID，也不得合成其assertions。

本结论不影响新隔离E2E的业务证据，也不把旧Run转为FAIL或PASS。V1正式版本保持INCOMPLETE；五个阶段均未达到当前全部交付及人工验收条件。
