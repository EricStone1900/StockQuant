# W7 V3.3 双轮次 Runner 执行与进程恢复烟测

日期：2026-10-01  
结果：PASS（隔离确定性 Fixture Runner 工作流）；V3.3 业务验收保持 NOT_RUN。

## 运行内容

新增 `pnpm --filter @stockquant/research-automation-service v33:runner-host-rounds-recovery-http-smoke`，并纳入完整 V3.3 code suite。执行使用专用`research_automation_test` PostgreSQL、FakeBroker、没有模型密钥/出口的独立 Research Automation 进程和固定 digest Runner 容器。临时随机 TestRun 绑定`rounds=2` Experiment，冻结的一段 Python Fixture 代码生成每轮结果和汇总；这不是RD-Agent流程，也没有模型调用。

验证结果：TestRun `26472b45-2833-4339-b6f2-33d5b968c1b7`，Job `26472b45-2833-4339-b6f2-33d5b968c1b7:558ad352-bf51-4e5f-bf77-624667a677c6`；Host 1 在运行容器时SIGKILL，Job租约过期后Host 2以fencing token 2接管；心跳续租可见，旧容器已移除。`round-1.json`、`round-2.json`及聚合结果三个产物全部发布并按SHA-256与字节解析复验。旧fencing token对发布端点的重放返回HTTP 409。实验/Job/ArtifactRef行与本地临时目录由脚本finally按本次精确ID清理。Provider调用0，订单0。

此前两次重跑在新增校验代码中分别遇到漏导入assert与遗留单产物变量引用；原始失败保留。两次错误均发生在真实恢复/Artifact生成之后，finally路径执行；修复后使用新随机TestRun重跑通过。本报告只引用最后PASS运行。

## 完整 V3.3 code suite

`pnpm verify:stage -- --stage V3.3 --suite code`退出0：契约/Fixture基线通过；Research Automation lint、169单测、21项隔离PostgreSQL集成和身份/派发/预算/恢复HTTP smoke通过；Platform API 101单测/3集成、类型检查通过；Web类型检查和Playwright 3/3通过。最终报告明确：`businessWorkflow=NOT_IMPLEMENTED`、`stageBudgetControl=NOT_IMPLEMENTED`、`paperContinuity=NOT_CHECKED`、`businessValidation=NOT_RUN`、`humanAcceptance=NOT_RUN`。

## 适用边界

这提高了W7已实现基础设施的端到端证据：耐久队列、真实受限容器、轮次数元数据与确定性轮次文件、Host故障接管、fencing及不可变产物发布。它不实现完整研究编排、检查点内续跑、TestRun/阶段原子预算、全尝试/供应商账单核对、正式页面创建/派发/同Run证据导出，也不验证真实Paper负载共存。Mac本地容器验证不能替代Ubuntu实机、真实Provider、外部来源授权或用户验收；`NO_TRADE`保持。

文件Hash见同目录`2026-10-01-w7-v33-runner-rounds-recovery.sha256`。
