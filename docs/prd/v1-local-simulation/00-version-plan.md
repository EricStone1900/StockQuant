# V1 小数据本地模拟闭环：开发计划

## 1. 目标和范围

在 Mac M1 上使用小样本与真实 Qlib，完成双市场确定性模拟闭环及可长期保留的 Web 验收中心。A股为主要交互路径，美股用明确的 Fixture 验证完整基础链路。

对应原 D0～D4 与 R0 的交付方向；V1.2 提前做 RD-Agent 环境探针，完整研究功能留在 V3。所有 brokerMode=FAKE；不接真实券商。

## 2. 数据与环境

A股10～20只股票、建议1～2年日线，至少覆盖因子预热窗口；美股3～5只及独立夏令时/结算样本。另有手算小样本、历史退市/公司行动和缺失状态样本。合成数据统一标 FIXTURE/SIMULATION_ONLY，不作为收益有效性证据。

Mac M1优先Linux ARM64容器，先验证依赖再承诺原生支持。Linux AMD64作为目标Ubuntu为x86时的验证平台，Ubuntu ARM64则按实际目标调整。按[共同规则](../05-three-version-delivery.md)分别记录本地、模拟架构及真实Ubuntu证据。Web开发服务器可原生热更新，阶段验收必须覆盖容器服务。

## 3. 阶段顺序

| 阶段 | 交付 | 依赖 | 状态 |
|---|---|---|---|
| [V1.1](./01-environment-and-web-center.md) | 环境、账户初始化与 Web 验收中心 | 本文件前置条件；详细依赖见阶段文件 | PARTIALLY_IMPLEMENTED（2026-09-09既有范围自动与人工验收保留；2026-10-01公共Schema/TS-Python生成、账户详情/双市场幂等初始化、隔离stage存储Web/CLI同run、A股Calendar与Market Data分钟导入/上传客户端已有工程证据；DC-06分页/脱敏导出现有ProjectToken生成客户端与隔离HTTP/PG验证；Research Artifact `expiresAt`/`EXPIRED`状态与禁止复活有Research/Platform隔离PG、单测及完整V3.1回归证据。完整跨服务客户端发布流程、跨服务Artifact统一后端/策略调度、活动API切换/回退及新增范围用户验收仍未完成；当前49 legacy/44 shadow快照复演已验证只补5条并通过V1.1 code suite，但Runbook维护窗口与旧RUNNING/WAITING记录处置仍待完成；详见阶段文件与W1记录） |
| [V1.2](./02-small-data-and-qlib.md) | 小样本数据、真实 Qlib 与环境探针 | V1.1；详细依赖见阶段文件 | PARTIALLY_IMPLEMENTED（2026-10-06隔离代码套件、Artifact状态机及当前操作手册已验证；新增范围人工验收、历史TestRun `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`导出及W8 Ubuntu实机复核未完成） |
| [V1.3](./03-fake-broker-trading-loop.md) | 治理、风控与模拟券商完整交易链路 | V1.2；详细依赖见阶段文件 | PARTIALLY_IMPLEMENTED（2026-09-09历史范围签署保留；2026-10-08版本化双市场Fixture由Web实际消费；修复MANUAL/AUTO刷新后订单回读；固定21项隔离Web/API/CLI矩阵和当前V1.3完整code suite均PASS，FakeBroker固定取消/成交竞态及LIVE/REAL提案拒绝另有PostgreSQL/API断言。当前新增范围人工验收NOT_RUN；未建模市场/订单故障边界、完整市场规则及日历、目标Ubuntu交付和第2/7/8节余项仍开放。详见[本轮审计](../../../evidence/audits/2026-10-08-p3-v13-fixture-and-handoff.md)） |
| [V1.4](./04-daily-backtest.md) | 日线历史回测与可核对报告 | V1.3；详细依赖见阶段文件 | PARTIALLY_IMPLEMENTED（历史自动/人工PASS保留；2026-10-07当前工作区V1.4 code suite通过；随机隔离API/PostgreSQL/Quant/Web/CLI持久任务复验Playwright 5/5，16个Platform TestRun、15个Quant BacktestRun/Manifest/结果Hash配对及7个Web TestRun同Run CLI核验；覆盖预执行取消、Quant调用前进程恢复、Quant记录与Manifest提交后进程恢复、同ID幂等重放与冲突409；SELL/T+1、结算、历史费率及合成RAW拆股/分红账务有固定Fixture切片；Quant与Trade/FakeBroker规则仅部分对照。完整适用公司行动/全市场规则与日历、Qlib/Paper逐规则对照、完整恢复矩阵、人工手册交付仍未完成；详见[持久任务审计](../../../evidence/audits/2026-10-07-v14-durable-tasks-3e249b385f39763ddd91.md)） |
| [V1.5](./05-scheduling-and-recovery.md) | 无人逐笔操作、故障恢复与 V1 验收 | V1.4；详细依赖见阶段文件 | PARTIALLY_IMPLEMENTED（历史自动/人工/Ubuntu签署保留；normal NO_TRADE原子Outbox/JetStream/Temporal、固定120次权威HOLD、NATS/Temporal服务/API/网络/PG会话恢复、单消费者lost-ACK与瞬态NAK重投、Activity执行中Worker重启及双Worker独立consumer/Workflow启动幂等隔离E2E通过；2026-10-07当前完整stage code suite exit 0；交易/日终、UNKNOWN、双Worker故障切换/备份矩阵、第2/7/8节交付和新增范围人工/目标Ubuntu验收未完成） |

以功能纵向切片交付；服务内部仍采用S0～S6生命周期。每阶段先冻结场景和预期，再同时开发后端与Web，执行自动检查后人工验收。后续独立工作可推进，但未通过的依赖不能被假成功替代。

## 4. 每阶段必交材料

- 任务清单及接口/数据/状态变更，更新的依赖锁、镜像与迁移。
- 正式功能页与验收中心场景：正常、拒绝/异常、重试/恢复中适用项。
- 固定数据和假依赖清单；实际组件与Fixture分开标记。
- 自动检查报告、浏览器截图、业务ID/Trace与人工签署。
- 运行/排错说明、已知限制、后续阶段所需契约和性能缺口。

## 5. 验收口径

本版各阶段[测试](./90-test-plan.md)和[验收](./99-acceptance.md)均需完成。流程成功、自动断言通过与人工批准分开保存。未跑、缺少数据/凭证/主机、观察期未满均保留NOT_RUN；业务不变量失败为FAIL。小数据通过只证明对应范围，不能推算全量性能或收益有效性。

## 6. 开发工作包约定

每次开始一个阶段，读取该阶段文件及共同规则，把复选任务作为本次边界。先确认已有工作区改动和依赖状态，按契约→最小后端→同步Web→异常→证据推进。不得仅搭空页面就报阶段完成；不得接入真实券商，也不得把假订单变成实际券商测试单。
W9版本门禁结构审计（2026-10-01）：当前验证还检查本版本阶段链接/第2、7、8节和共享需求追踪矩阵存在性；三版阶段结构均通过，但业务/观察/人工验收状态不因此改变。实现与范围见[W9结构门禁审计](../../../evidence/audits/2026-10-01-w9-stage-document-guard.md)及[代码SHA-256](../../../evidence/audits/2026-10-01-w9-stage-document-guard.sha256)。
