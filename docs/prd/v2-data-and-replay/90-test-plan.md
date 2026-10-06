# V2 免费数据、分钟回放与连续模拟：测试计划

执行[总体测试](../90-test-plan.md)中本版适用的模拟子项及[共同规则](../05-three-version-delivery.md)。各项状态以最新测试证据为准，未执行或依赖真实交易日/人工确认的子项仍为 `NOT_RUN`。

## 1. 阶段测试映射

共享数据采集新增[DC-T01～DC-T25测试矩阵及恢复手册](./07-data-collection-tests.md)，初始全部NOT_RUN；在V2.5内扩展采集场景，既有测试不自动覆盖新增要求。计划1.1区分DC-08A短期真实运行/开发交付与DC-08B后续60日数据验收，前者完成后恢复主项目开发。

| 阶段 | 自动检查 | 人工操作 |
|---|---|---|
| V2.1 | Adapter契约与真实来源烟测、分批限流/缓存/去重、50/80/100容量和101拒绝、时间戳/陈旧/新闻注入浏览器测试。 | [阶段验收步骤](./01-free-data-and-news.md) |
| V2.2 | 字段单位/时间边界/质量规则、真实存储导入幂等与中断恢复、分钟查询分页及Web导入E2E。 | [阶段验收步骤](./02-minute-data-import.md) |
| V2.3 | 同Bar未来泄漏、订单因果顺序/参与率、领域规则一致性、检查点恢复、两次运行隔离及分钟回放Web E2E；code suite另执行锁定Linux/amd64 Qlib Worker `LGBModel.fit/predict` 合成Fixture冒烟（Mac ARM宿主为仿真），并对Qlib Artifact旧JSONB回填执行专用PostgreSQL隔离集成测试（dry-run、校验后CAS、重读和重跑幂等）。合成冒烟不替代冻结市场数据、生产研究路由或独立模型验证；隔离回填不授权生产迁移。 | [阶段验收步骤](./03-historical-minute-replay.md) |
| V2.4 | 十个唯一采样窗口及±60秒排程质量、唯一09:31执行窗口、逐请求证券覆盖/唯一性/LIVE_SOURCE/0～1800秒新鲜度、真实来源与FakeBroker集成、浏览器关闭、断网恢复、实际交易日观察；code suite另经隔离PostgreSQL和真实HTTP核验normal/rejection/recovery持久化为WAITING、session/owner拒绝；真实Chromium→Vite→Platform API→隔离PostgreSQL→CLI核验同一TestRun并以`--check-only`保留WAITING/exit 2；P5.5只读就绪端点以Trade Execution容器+临时PostgreSQL实测CN_A BLOCKED、US_EQUITY REJECTED、错误身份403及FakeBroker账本零写。准备态 smoke 不表示Paper执行链完成；容器AMD64仿真不替代Ubuntu实机。 | [阶段验收步骤](./04-continuous-paper-trading.md) |
| V2.5 | 扩容前后小样本回归、缓存隔离、Walk-forward/PIT、资源预算/取消/恢复、V2全阶段Web回归。 | [阶段验收步骤](./05-data-scale-and-v2-acceptance.md) |

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

2026-10-02 V2.4 P-F05追加离线持久化场景：FakeBroker对已有部分Fill的重复/并发取消请求幂等保留`CANCEL_REQUESTED`，平台专属Bearer经版本化OpenAPI提交模拟接受/拒绝结果；接受回报事务提交`CANCELLED`，拒绝恢复`PARTIALLY_FILLED`，迟到相反结果无效。Fill Outbox未投账时Reservation解决Outbox必须等待Fill已投Portfolio后才创建；后台按租约投递，失败可重试/补偿。隔离PostgreSQL覆盖重连、Fill/Outbox保持、释放事件顺序；Portfolio PG集成验证部分BUY捕获2010后`CANCELLED`只释放余量并允许重新预留5980。真实Fill/撤单因果竞态、费用更正和可注入外部订单仍NOT_RUN；见[W2审计](../../../evidence/audits/2026-10-02-w2-fakebroker-partial-cancel-idempotency.md)。

2026-10-02 P-F05 Portfolio费用更正接收端：版本化`FillFeeCorrectionCommand`经Trade Execution独立Bearer进入Portfolio；原Fill费用/现金流水不覆盖，按每Fill连续revision和previousFee事务校验，原子附加`FEE_CORRECTION`差额LedgerEntry、调整现金及BUY预留捕获金额。同一修订重放幂等，改写/跳版拒绝；原Fill在修订后重投仍按original fee正确识别。隔离PostgreSQL验证fee 1→2→1、精确现金及捕获金额；HTTP smoke验证正确身份、错误Platform身份403和重试。契约/Schema/OpenAPI/生成客户端通过`pnpm contracts:check`。这只证明Portfolio端；FakeBroker还没有版本化费用事件与持久Trade Outbox，端到端费用更正仍NOT_RUN。见[接收端审计](../../../evidence/audits/2026-10-02-w2-portfolio-fee-correction.md)（SHA清单作为该次执行的历史点时快照留存）。

2026-10-02 P-F05并发撤单结果补充：隔离PostgreSQL中对同一部分成交订单并发提交ACCEPTED/REJECTED两种模拟权威撤单结果，验证生产仓储行锁使且仅使一个结果事件提交，失败方不会改写事实；待处理Fill Outbox期间不释放Reservation。专用容器`sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`测试退出0且清理。此测试不模拟Broker事件序号乱序，不替代Fill与取消的交错因果矩阵；费用修正、独立外部单仍NOT_RUN。见[W2审计](../../../evidence/audits/2026-10-02-w2-fakebroker-partial-cancel-idempotency.md)。

2026-10-03 ADR-0008事件序号持久集成复核：全`pnpm verify:stage -- --stage V2.4 --suite code`退出0，Trade单测15文件/67项通过；P5.7 HTTP/PG TestRun `5b5cabfe-8965-4106-8980-109a71c1e112`验证取消序号2先到持久缓冲、gap跨Trade重启保存、补收Fill序号1后按序归并、重复幂等/冲突拒绝、reservation等待Fill Outbox全部投递。四个Paper API和四个Web场景同Run CLI均通过。完整机器报告/日志见[W2当前V2.4 suite](../../../evidence/audits/2026-10-03-w2-fakebroker-event-sequence-full-v24-suite.md)。FakeBroker集成不代表真实券商语义、业务人工签署或市场观察门槛完成。

2026-10-05 P-F05当前状态及V2.4完整回归：普通沙箱首跑在Qlib Worker loopback端口绑定处`EPERM`，受控本机loopback复跑完整`pnpm verify:stage -- --stage V2.4 --suite code`退出0。新隔离PostgreSQL及P5.7跨服务用例验证撤单序号乱序缓冲、重启后缺口续存、按序归并、Fill Outbox屏障、迟到事件隔离、费用更正和原Fill不可变；四个API场景与四个Web场景同Run CLI检查通过。机器摘要及API/Web Run详情见[2026-10-05 W2/V2.4 suite](../../../evidence/audits/2026-10-05-w2-v24-code-suite.md)与[完整Paper Smoke JSON](../../../evidence/audits/2026-10-05-v24-paper-smoke-9cb5834e8c3e4b318a95e6791623f836.json)。这更新了2026-10-02/03“竞态或费用更正仍NOT_RUN”的历史状态；历史记录原样保留。结论仍限于Fixture/FakeBroker/隔离数据库，真实来源、连续Paper、20日观察、Ubuntu及新范围人工验收仍未完成。

2026-10-03 W4 current-code synthetic Qlib check: `pnpm --filter @stockquant/quant-research-service qlib:fit-smoke` passed in the pinned network-disabled Linux/amd64 container (120 synthetic rows; 72/24/24; deterministic model and prediction hashes). `pnpm --filter @stockquant/platform-api-service v23:qlib-fixture-testrun-smoke` passed the isolated Web→Platform→Quant Worker→PostgreSQL/content-store path; TestRun `2674d870-f73d-456b-9630-4209e0dce45f`; model/artifact SHA-256 `24864d22e4016e1419382e380aec504f02607004262696c92b76451cc1dbb6a8`; same-run CLI `--check-only` passed; evidence manifest SHA-256 `76a60f7d0736dd022057d6c8c8cff7a945fbff9970f63496f219ec35fd75a3e1`. Temporary test resources were removed. This adds automated synthetic-Fixture evidence only; independent validation, authorized real market data, actual Ubuntu x86_64, and user acceptance remain NOT_RUN. No acceptance signature is added by this record.

2026-10-03 V2.3 full code suite rerun: controlled isolated `pnpm verify:stage -- --stage V2.3 --suite code` exited 0; default-sandbox Qlib loopback `EPERM` failure is retained. The pinned network-disabled Linux/amd64 Qlib worker (emulated on Apple Silicon) used 120 synthetic rows with chronological 72/24/24 split and produced 24 finite predictions with deterministic hashes. TestRun `5595be61-15b5-4bf9-8b1a-0c3985db98d7` passed `V2.3-QLIB-FIXTURE-001`; CLI check-only exit 0; Manifest SHA-256 `af4f02fd18cef224a32f3fc75faba98cd6f9bbda30e2b0f3aec037fe2b5f948b`. Independent model validation, real-data/PIT and human acceptance remain NOT_RUN. Details: [W4 rerun audit](../../../evidence/audits/2026-10-03-w4-v23-current-fixture-rerun.md).
