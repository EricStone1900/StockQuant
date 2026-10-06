# V3 RD-Agent 自动研究与 Ubuntu 交付：测试计划

执行[总体测试](../90-test-plan.md)中本版适用的模拟子项及[共同规则](../05-three-version-delivery.md)。初始状态全部NOT_RUN；本文件不会创建可运行脚本。

## 1. 阶段测试映射

| 阶段 | 自动检查 | 人工操作 |
|---|---|---|
| V3.1 | 实际RD-Agent小实验、真实Runner权限/资源隔离、模型故障与预算、任务/Artifact持久化及研究Web E2E。固定Fixture本地全链路另用`pnpm --filter @stockquant/platform-api-service v31:fixed-pipeline-web-http-smoke`覆盖Chromium→Vite→平台→研究→冻结Runner→同TestRun输出读取和关页恢复；隔离HTTP smoke覆盖exit-17失败、一秒超时、128 MiB OOM、`--network none`连接拒绝及活动Runner持久取消（无输出Artifact、容器移除、费用只结算一次、零外部模型调用）。OOM/网络失败各自与Market Data隔离PG集成、P5.7订单恢复并发运行通过，但不构成生产Paper连续可用性或容量证据。生产出口/DNS策略、固定Fixture检查不能替代真实RD-Agent及人工验收。 | [阶段验收步骤](./01-rdagent-small-experiments.md) |
| V3.2 | 研究身份越权、独立复算/批准状态机、版本失效、候选到Paper全链路E2E，真实候选与Fixture来源区分。 | [阶段验收步骤](./02-candidate-validation-and-promotion.md) |
| V3.3 | 预算/并发/恢复/取消、不可重复发布、录制回放与代码复算、研究压力下核心Paper可用性。现有证据覆盖队列/分页账本只读 API、持久化WAITING准备态TestRun、Platform Owner边界、同run CLI check-only及Web E2E；Platform V3.3状态迁移另有隔离PostgreSQL集成验证前态历史、精确重放、恢复重排队与终态不可复活（[W7状态审计](../../../evidence/audits/2026-10-03-w7-v33-run-state-history.md)）。readiness TestRun还保存Paper调度器快照与O2合格观察日摘要，以注入Clock计算新鲜度，并强制`PAPER_CONTINUITY=NOT_VERIFIED`；单测验证最新观察日的降序选择，Playwright验证UI显示预检阻塞仍不是通过（[W7预检审计](../../../evidence/audits/2026-10-03-w7-v33-paper-preflight.md)；[完整套件](../../../evidence/audits/2026-10-03-w7-v33-paper-preflight-full-suite.log)；[UI E2E](../../../evidence/audits/2026-10-03-w7-v33-paper-preflight-web-e2e.log)）。最终套件Research 216/216 unit、29/29 PG integration，Platform 173/173 unit、6/6 PG integration，Web 3/3；真实V3.3 Experiment/Runner派发、阶段业务工作流、预算/轮次汇总编排、检查点执行、Paper连续性测试仍待实现/验证。 | [阶段验收步骤](./03-research-scale-and-recovery.md)；[V3.3队列读取审计](../../../evidence/audits/2026-09-27-v33-runner-queue-read.md) |
| V3.4 | Ubuntu真实镜像/迁移/恢复/模型烟测、全阶段浏览器与领域E2E、架构数值比较、连续Paper观察。 | [阶段验收步骤](./04-ubuntu-migration-and-release.md) |

## 2. 共同测试流程

每阶段文件第7节为可勾选交付待办、第8节为验收操作手册。当前全部DRAFT_NOT_EXECUTABLE；阶段交付前开发者必须填齐实际环境/Fixture/URL/命令/测试清单并实测，才能改为VERIFIED_EXECUTABLE（仅表示手册实测可执行，不代表用户已验收）。

命令参数遵守共同规则第10节：normal/rejection/recovery与Web共享场景；code套件调用真实代码检查；check-only核对同一Web运行且不发起业务动作。保留预期异常的原业务状态，断言验证成功才退出0。人工确认不能由脚本生成。

1. 选择冻结的scenarioVersion、Fixture/DataVersion、市场、模拟账户、seed及目标环境，创建独立testRunId。
2. 执行正常场景，先检查真实后端事实与数值，再在正式页面查看；记录所用替身和外部实际来源。
3. 执行阶段规定的拒绝/异常场景，比较失败原因及副作用次数；需要恢复的场景核对订单、资源和账本。
4. 重复提交和刷新/关闭页面；验证幂等、后台继续、证据持久化以及跨运行隔离。
5. 运行Web自动E2E及适用Domain/DB/契约/事件测试。领域计算不能只依赖浏览器截图验证。
6. 人工核对页面可理解性和证据，填写版本验收；挂起、取消、缺依赖和未跑均不能自动变PASS。

## 3. 精度与证据

金额、数量、费用舍入、预算计数、唯一性按冻结规则精确验证；研究浮点按预设绝对/相对容差。研究排序并列时采用稳定次序，记录由数值差异造成的候选变化。原始Artifact Hash与规范结果Hash分开，运行ID、日志时间不能混入跨运行相等断言。

每个用例记录testRunId/业务ID/Trace、真实或Fake依赖、命令退出码、检查输出与浏览器截图。先实现共同规则列出的命令入口再执行，不存在命令必须报失败，不能空脚本返回0。

2026-10-03 W5 V3.1当前离线代码套件复跑：使用`run-isolated-postgres-command.mjs`在随机一次性PostgreSQL容器中提供Research Automation/Platform两个数据库后，完整`pnpm verify:stage -- --stage V3.1 --suite code`退出0；Linux ARM64本地Research Fixture镜像digest `sha256:5a6177721fb5623ac75dbfa5da317c509f3a47d9e1802a84d0198c06adaa51f2`，离线RD-Agent/LiteLLM Runner digest `sha256:eb9030b8107c79c3554dabc68322814b81c04564bb0a1e5a9841bd603a67ccf1`。Fixture Model Gateway与预算Smoke均报告外呼0；Artifact owner-scope/export TestRun `729fbc7a-ec4f-421d-b884-58b25be79c19`验证精确字节与异主403。临时PostgreSQL容器/网络已清理，`activeServicesTouched=false`。此代码套件不发真实Provider调用，不证明真实RD-Agent研究/账单/Ubuntu或人工验收；详见[W5审计](../../../evidence/audits/2026-10-03-w5-v31-isolated-code-suite.md)、[JSON](../../../evidence/audits/2026-10-03-w5-v31-isolated-code-suite.json)和[SHA](../../../evidence/audits/2026-10-03-w5-v31-isolated-code-suite.sha256)。

2026-10-03 W6 V3.2准备态完整code suite复验：`run-isolated-postgres-command.mjs`提供Platform API临时PostgreSQL后，`pnpm verify:stage -- --stage V3.2 --suite code`退出0。70项冻结候选/参考实现重算比对通过（linux/amd64网络none evaluator，误差容差1e-6）；隔离readiness HTTP recovery TestRun `f6239ede-cc29-41cb-ae81-3545506e38a8`保持WAITING/READINESS_ONLY，重启读回、owner 200/匿名401/异主403通过，业务验证NOT_RUN、Paper调用0、活动Registry未修改。Web typecheck/build/unit均通过；临时PG/网络及Docker smoke资源清理通过。V3.2仍无真实候选/用户批准，人工验收NOT_RUN；完整边界见[W6审计](../../../evidence/audits/2026-10-03-w6-v32-isolated-code-suite.md)、[JSON](../../../evidence/audits/2026-10-03-w6-v32-isolated-code-suite.json)与[SHA](../../../evidence/audits/2026-10-03-w6-v32-isolated-code-suite.sha256)。

2026-10-03 W7 V3.3隔离代码套件完整复验：`run-isolated-postgres-command.mjs`下`pnpm verify:stage -- --stage V3.3 --suite code`退出0。Research 216/216单测、29/29集成；Platform 180/180单测、6/6集成；Web Playwright 3/3。Runner两轮、1,000行Fixture在SIGKILL和租约接管后恢复游标2、fencing token 2；模型/Paper调用0。66,100行合成容量数据的50k深页offset/cursor p95分别864.686/237.180ms，仅为隔离热缓存数据库微基准。一次性数据库容器/网络清理已核实。业务工作流未实现，Paper连续性、业务验证和人工验收仍NOT_RUN；详见[W7审计](../../../evidence/audits/2026-10-03-w7-v33-isolated-code-suite.md)、[机器结果](../../../evidence/audits/2026-10-03-w7-v33-isolated-code-suite.json)及[SHA-256](../../../evidence/audits/2026-10-03-w7-v33-isolated-code-suite.sha256)。
