# StockQuant 架构设计索引

日期：2026-09-07。状态：目标设计/NOT_RUN。本目录细化现有PRD，不表示服务已经实现。

## 阅读顺序

1. [整体架构](./01-system-architecture.md)：系统边界、依赖、流程、所有权与三版映射。
2. [跨服务契约与数据](./02-contracts-and-data.md)：身份、事务、幂等、时间、存储与迁移。
3. [部署与运维](./03-deployment-and-operations.md)：Mac M1、Docker、Ubuntu、隔离与恢复。
4. [历史回放](./04-historical-replay.md)：虚拟时钟、分钟撮合、屏障与检查点。
5. 对应服务文件及[Web/验收中心](./components/web-and-acceptance-center.md)、[FakeBroker](./components/fake-broker.md)。

## 文档关系

范围依据[PRD入口](../docs/prd/README.md)和[三版共同规则](../docs/prd/05-three-version-delivery.md)，业务语义依据[市场契约](../docs/prd/03-market-rules-and-contracts.md)。本目录细化[原总体架构](../docs/prd/02-system-architecture.md)，不是另一套产品要求，也不替代生成Schema。

原PRD保留原位及相对链接，docs/prd包仍可独立复制；本目录相对引用该包。若修改服务边界/协议，必须同步PRD、契约、阶段、追踪和测试/验收。出现矛盾时按已确认本轮范围和业务不变量核实并修正文档，不自行扩大到真实券商。

## 12个领域服务

| 服务文档 | 技术基线 | 交付范围 |
|---|---|---|
| [market-data-service](./services/market-data-service.md) | Python / FastAPI + 导入与采集Worker | V1.2日线与Fixture；V2.1免费来源；V2.2分钟导入；V2.5扩容。 |
| [quant-research-service](./services/quant-research-service.md) | Python / FastAPI + CPU计算Worker / Qlib Adapter | V1.2因子/策略；V1.4日线回测；V2.3分钟回放；V2.5模型验证；V3.2候选复算。 |
| [portfolio-risk-service](./services/portfolio-risk-service.md) | TypeScript / NestJS + PostgreSQL | V1.1账户初始化；V1.3资源/风控/账本；V1.4起回测/结算；各版复用。 |
| [decision-governance-service](./services/decision-governance-service.md) | TypeScript / NestJS + PostgreSQL | V1.3人工/自动授权；V1.5失效/恢复；V3候选激活后仍复用本域规则。 |
| [trade-execution-service](./services/trade-execution-service.md) | TypeScript / NestJS API + Gateway/报告Worker + PostgreSQL | V1.3模拟协议/状态机；V1.5恢复；V2.3历史Adapter；V2.4快照模拟；真实Broker延后。 |
| [workflow-orchestration-service](./services/workflow-orchestration-service.md) | TypeScript / Temporal Worker + 调度/事件Starter | V1.5完整调度恢复；早期阶段可用明确受控编排切片；V2持续Paper/回放粗粒度管理。 |
| [platform-api-service](./services/platform-api-service.md) | TypeScript / NestJS BFF + 持久任务协调 | V1.1建立身份/健康/TestRun，全部14阶段增量扩展；不新增独立验收平台服务。 |
| [news-intelligence-service](./services/news-intelligence-service.md) | Python / FastAPI + 来源采集Worker | V2.1采集/去重/实体关联/修订/展示必交；模型事件分析与自动动作不属于本轮默认范围。 |
| [market-monitor-service](./services/market-monitor-service.md) | Python / FastAPI Worker | V2.1在线池/采样策略与质量；V2.4持续监控；高级盘中风险动作/漂移模型后续。 |
| [market-regime-service](./services/market-regime-service.md) | Python / FastAPI + 状态计算Worker | 完整状态策略不在V1～V3必交范围；本文保留长期设计，启用前单独建立阶段/测试，不自动启动。 |
| [agent-service](./services/agent-service.md) | TypeScript / 通用Kernel + Provider Adapter | V3按需交付模型网关/预算审计/Schema验证必要子集；六角色分析和Memory工具后续，不阻塞V1/V2。 |
| [research-automation-service](./services/research-automation-service.md) | Python API + RD-Agent控制器 + 隔离Runner | V1.2兼容探针；V3.1实际小实验、V3.2候选、V3.3扩容恢复、V3.4Ubuntu。 |

Web是应用，FakeBroker是独立测试边界组件，ReplayRunner归量化域，历史Adapter/Gateway归执行域；不因此新增重复领域服务。市场状态和完整六角色Agent默认后续，启用前需独立阶段/S0～S6及证据。

## 开发阶段

- [V1五阶段](../docs/prd/v1-local-simulation/README.md)：小数据与模拟闭环。
- [V2五阶段](../docs/prd/v2-data-and-replay/README.md)：真实来源、分钟回放与持续Paper。
- [V3四阶段](../docs/prd/v3-research-and-ubuntu/README.md)：实际RD-Agent、复算批准与Ubuntu。

每服务文件包含职责/边界、内部分层、逻辑持久化、端口/依赖、事件流程、失败恢复、部署、Web与测试。逻辑表/扩展路由作为S0输入，确切DDL、依赖版本和端口在对应阶段实测冻结；不能由文档完成推断业务PASS。
