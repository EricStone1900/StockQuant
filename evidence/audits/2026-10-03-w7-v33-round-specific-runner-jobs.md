# W7 V3.3 轮次级Runner Job身份修复与完整套件（2026-10-03）

## 改动与验证

`RunnerJobCoordinator`之前始终以`testRunId:experimentId`作为Job主键；同一多轮Experiment的第2轮与第1轮会争用同一持久记录。现未指定`roundIndex`时保留原key以兼容历史单Job记录；显式轮次使用`testRunId:experimentId:round-N`，每轮可独立入队/查读/租约恢复，重复提交同轮幂等，不同载荷冲突。重试仍从对应轮次Job派生attempt ID。

新增内存单测验证两轮身份隔离及逐轮幂等，新增PostgreSQL集成覆盖同TestRun/Experiment两轮写入/分页读取。更新HTTP smoke，实际将同一3轮预算Experiment的round 1和2都提交，并断言返回两个确定ID、队列留存两条不同轮次及错误身份/未分配轮次继续拒绝。Runner Host恢复烟测以round-1真实ID查询/清理，避免仍轮询旧主键。

完整命令`pnpm verify:stage -- --stage V3.3 --suite code`退出0。Research Automation 36文件/203单测、4文件/28 PG集成；Platform API 46文件/166单测、4文件/5集成；V3.3 Playwright 3/3；预算分页探针及双轮次Linux容器Fixture Runner SIGKILL/过期租约接管/fencing/旧容器移除/资源采样/Artifact Hash smoke通过。Runner Host smoke TestRun `aace7f14-a355-4049-aa5a-9ea694de46c6`使用round job `aace7f14-a355-4049-aa5a-9ea694de46c6:58a1acc0-7308-4f4c-b989-5669c6802d5c:round-1`；HTTP dispatch TestRun `15e3643d-4f6a-4664-9c2c-6127ef8a9a16`实际入队相同Experiment的round-1与round-2。原首轮完整suite失败由旧Runner Host smoke轮询key导致；诊断与代码改正记录见[首轮失败诊断](2026-10-03-w7-round-identity-regression-diagnosis.md)，随后同一命令完整重跑成功。最终完整日志见[套件日志](2026-10-03-w7-v33-round-specific-runner-jobs-suite.log)。源码Hash见[源码Manifest](2026-10-03-w7-v33-round-specific-runner-jobs.sources.sha256)，本审计Hash见[SHA-256](2026-10-03-w7-v33-round-specific-runner-jobs.sha256)。

## 范围边界

容器任务运行确定性Fixture，Model/Provider调用0；没有Paper、行情或Broker调用。容量探针是隔离合成PG读微基准，Runner是Mac arm64宿主Linux容器，不是生产容量或Ubuntu证据。suite仍明确`businessWorkflow=NOT_IMPLEMENTED`、`paperContinuity=NOT_CHECKED`、`businessValidation=NOT_RUN`、`humanAcceptance=NOT_RUN`。轮次级Job身份修复推进W7派发基础，但没有关闭正式研究工作流、供应商费用核对、Paper共存、Web/CLI完整业务场景、Ubuntu观察或用户验收。
