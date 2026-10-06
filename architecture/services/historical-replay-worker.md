# 历史回放 Worker

服务：`historical-replay-worker`。日期：2026-10-01。状态：已实现部分V2.3回放API；当前职责映射复核，目标架构不代表全部分层重构或版本验收完成。共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[历史回放规则](../04-historical-replay.md)、[安全与配置](../05-security-and-configuration.md)。

## 1. 范围与所有权

执行隔离的历史回放控制、运行身份和检查点协调。组合账本由Portfolio拥有，订单/成交由Trade Execution与FakeBroker拥有，治理授权由Decision Governance拥有，研究摘要由Quant拥有。Worker不得跨域写账本、生成第二份成交或自行批准策略。

现有`src/main.ts`已实现单Bar与多Bar Fixture流程、运行查询、暂停/继续/取消、UNKNOWN原订单查询恢复、持久检查点、服务Bearer验证和并发/运行锁。已有行为及限制以V2.3阶段文件、生成契约和对应测试为准。

## 2. 内部分层及当前映射

目标结构：

| 层 | 职责 | 当前状态 |
|---|---|---|
| `domain/` | 回放命令、Clock/检查点、生命周期与因果屏障规则 | 已有`commands.ts`、`checkpoint.ts`、`lifecycle.ts`、`events.ts` |
| `application/` | 启动/恢复/生命周期用例，协调运行仓储和外部域端口 | `replay-coordinator.ts`承载单Bar/多Bar执行、检查点屏障和UNKNOWN恢复用例 |
| `ports/` | RunRepository、Portfolio、Trade、Governance、Quant边界 | `replay-run-repository.ts`与`replay-downstream-clients.ts`定义出站接口 |
| `adapters/` | PostgreSQL实现及生成的跨服务HTTP客户端适配 | `postgres-replay-run-repository.ts`封装DDL/SQL、状态转移和advisory lock；生成HTTP实现继续由`contracts/`提供并按ports注入 |
| `bootstrap/` | 环境配置、依赖装配、HTTP监听和关闭钩子 | `bootstrap/main.ts`装配依赖并承载HTTP入口；`src/main.ts`为稳定启动shim |

2026-10-01分层实施后，运行用例通过Repository与下游client ports协作；SQL由PostgreSQL adapter拥有，HTTP装配与服务身份入口留在bootstrap。合同生成器仍拥有各下游HTTP序列化/传输实现。分层扫描和V2.3 code suite通过；这不表示V2.3三种人工验收场景、当前活动部署或用户签署已完成。

## 3. 数据与一致性

Worker仅拥有`replay_worker_runs`中的运行状态、request hash、检查点与过程/最终结果。`test_run_id`与namespace唯一约束、PostgreSQL advisory lock和request hash防止并发副作用及同键异命令。每Bar在FakeBroker/Trade执行、Portfolio入账及因果屏障确认后推进检查点。恢复必须使用原run、原命令和原订单ID；UNKNOWN只查询原订单，不能盲目重发。

DDL当前由进程启动时创建/兼容迁移。分层改造不得改变现有列、约束、锁语义、检查点字段、幂等行为或历史数据。正式迁移文件化与部署顺序需根据适用阶段规则另行核实。

## 4. 接口与身份

现有外部协作由生成客户端和已发布契约定义；平台控制端点要求平台Bearer及可信服务身份。Worker向Portfolio、治理、执行、Quant分别使用窄scope独立服务身份，不接受事件或请求正文充当授权。精确路径、输入限制、状态码、超时及错误语义以OpenAPI/契约和HTTP集成证据为准。

## 5. 故障与运行

暂停不推进虚拟时钟；取消在Bar边界停止新增步骤。重启后从已提交检查点恢复；检查点和累计执行证据不一致时拒绝推进。HTTP重复请求可返回已完成结果或冲突。运行容量、最大并发、DB可用性及身份配置通过ready探针报告。历史业务时间应使用run-scoped Clock；当前持久化审计列使用数据库时间，仅作为基础设施记录时间。

## 6. 验证及剩余工作

已有单测覆盖commands、checkpoint、事件屏障、生命周期、生成客户端和服务身份；V2.3文档另有集成和恢复记录。该证据不替代当前工作树上针对后续修改的适用回归，也不代表人工签署。

分层回归记录：Worker build通过，9个测试文件/25项测试通过（新增UNKNOWN恢复不重发测试），层扫描PASS，V2.3 code suite退出0。另运行服务身份HTTP smoke，14项未授权路由探测、持久化run GET投影（requestHash不外泄）和原有授权/消费/续期用例通过。V2.3 normal/rejection/recovery真实stage TestRun、人工接受与现有服务切换未在本次分层变更中执行；各自状态仍按阶段验收文档记录。

实现审计：[W1 Historical Replay层边界与回归](../../evidence/audits/2026-10-01-w1-historical-replay-layer-boundary.md)（SHA-256见同名`.sha256`清单）。
