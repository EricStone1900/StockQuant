# V1.1 责任与交付类型人工核对 A01

日期：2026-10-10。结果：23条当前交叉矩阵中的V1.1来源行已核对主责与协作类别；结构化明细见[JSON](./2026-10-10-v1-v11-responsibility-a01.json)，SHA-256 `a9605f74c99bd4649d9c7b782b5d6030acc4b347e3f3e9c6d967ac08502c97c7`。来源为当前A31矩阵及V1.1阶段/服务架构；本审计只确认责任归属，不把代码/现有勾选当作交付通过。

| 来源行 | 主责 | 协作/外部动作 | 当前未关闭边界 |
|---|---|---|---|
| `V1.1-S2-L13` | packages/contracts | all contract-consuming V1 services | Contract package owns canonical schemas and code generation; each service owns business-level consumption. Platform TestRun uses a narrower TestRun domain type and ClockContext has no direct V1 consumer; do not infer runtime parity from generated copies. |
| `V1.1-S2-L14` | cross-service delivery; each consumer service owns its client adapter | Platform API, Trade Execution, Portfolio Risk, Historical Replay, Market Data, Decision Governance, Quant Research | OpenAPI/schema generation is shared tooling; each caller owns generated client and identity/scope use, each API owner its contract, each service its migration/layers. The all-operation production-call and deployment/release matrix remains incomplete. |
| `V1.1-S2-L19` | portfolio-risk-service | platform-api-service | Portfolio Risk owns Account/cash/position ledgers and persistence; Platform owns user-facing account initialization/details and calls Portfolio via generated client. Activity cutover is an Operations/owner task. |
| `V1.1-S2-L20` | artifact-content-store package; platform-api-service owns V1 Qlib metadata/TestRun projection | quant-research-service owns backtest reports; platform-api-service/evidence exporter read and package references | Shared content bytes are cross-cutting infrastructure; domain metadata remains with producers. OD-013 blocks automatic expiry/physical deletion. Full producer/reference matrix, active deployment and restore remain open. |
| `V1.1-S2-L26` | platform-api-service | apps/web, CLI verifier/evidence exporter, domain APIs | Platform owns local session, readiness, TestRun/assertion/evidence APIs; Web and CLI are clients. Business ledgers remain with their domain services. |
| `V1.1-S2-L27` | platform-api-service (storage implementation) | Operations owner and project owner for live change authorization | Platform owns legacy/stage reads, migration and dual-write behavior; operations owner must identify/backup/reconcile the actual host and run states; project owner authorizes maintenance. Active cutover is not authorized or deployed. |
| `V1.1-S2-L28` | quant-research-service owns Qlib adapter/worker | platform-api-service owns orchestration/Web; research-automation-service owns RD-Agent runner; project owner/environment operator owns host resource and Ubuntu evidence | V1 fixed Qlib/RD-Agent probes and Mac architecture evidence do not prove real RD-Agent execution, complete stack resource capacity or Ubuntu host acceptance. |
| `V1.1-S7-L65` | packages/contracts and Platform/API scenario contracts | Fixture authors and all participating domain services | Shared contract/scenario deliverable; current frozen schemas and fixed scenarios have evidence, but this checklist is not equivalent to completing every backend task. |
| `V1.1-S7-L66` | each participating domain service for its business behavior | platform-api-service for orchestration; test/evidence owners | Cross-service release item; stage remains open for artifact lifecycle and active storage rollout. |
| `V1.1-S7-L67` | apps/web and platform-api-service | V1.1 backend service owners | Web/acceptance shell and fixed normal/rejection/recovery slices are implemented; current-scope delivery and user acceptance remain separate. |
| `V1.1-S7-L68` | Platform/scripts and stage documentation | service owners for their configuration; project operator for host-specific values | Runbooks must be exact and executable; the recent V1.5 rehearsal surfaced and fixed missing API/session/stage parameters. V1.1 active cutover steps remain gated. |
| `V1.1-S7-L69` | cross-service test/evidence owner | Platform/Web and participating service owners | Developer execution is evidenced by isolated suites and runbooks; human review and live deployment are not implied. |
| `V1.1-S7-L70` | each domain service for restart/idempotency semantics | Platform/Workflow orchestration and operations for observation | Fixed isolated restart paths are covered; Mac sleep/wake and complete host/business restore remain NOT_RUN. |
| `V1.1-S7-L71` | project owner / human acceptor | none | Only the user can provide current-scope human sign-off. Historical sign-off remains limited to its recorded scope. |
| `V1.1-S7-L72` | Platform documentation owner | V1.1 stage/test/acceptance documentation owners | Documentation is cross-cutting; checklist completion must reference current actual outputs and retain limitations. |
| `V1.1-S8-L76` | platform-api-service and stack tooling | operator | Readiness/identity configuration belongs to Platform; random stack start/stop belongs to scripts and the operator. |
| `V1.1-S8-L96` | stack tooling and platform-api-service | all services in the selected Compose slice | Startup/configuration is cross-service; only exact random isolated project operations are authorized by this runbook. |
| `V1.1-S8-L114` | apps/web | platform-api-service and the business service owning each action | Web presents state; service owners provide authoritative domain behavior. Current browser proofs are fixed-scope only. |
| `V1.1-S8-L129` | scripts/verify-stage.mjs and scripts/evidence-export.mjs | platform-api-service for owner-scoped read APIs | CLI check-only/export operate on same TestRun. Correct stage, API URL and session are required; no human sign-off is generated. |
| `V1.1-S8-L164` | platform-api-service storage adapter/migrations | Operations owner and project owner | Isolation migration evidence exists; actual legacy→stage activity switch/rollback requires instance reconciliation, nonterminal Run disposition, paired restore and explicit maintenance authorization. |
| `V1.1-S8-L203` | each domain service for its persisted business facts | Platform for TestRun coordination; operations for host recovery | Recovery evidence must compare authoritative per-service facts. Isolated service restart is not full cross-service or host restore. |
| `V1.1-S8-L211` | Platform/acceptance documentation | project owner for current human conclusion | Acceptance table records evidence; only project owner records current-scope manual conclusion. |
| `V1.1-S8-L224` | project owner / human acceptor | Platform documentation owner | Scope clarification preserves historical signatures and identifies current additions; it cannot be signed by the developer agent. |

## 汇总结论

- 服务所有权：Portfolio Risk拥有V1.1 Account/现金/持仓权威事实；Platform拥有Session、TestRun、验收API及Web编排；共享Schema/Artifact内容内核是跨服务基础；每个消费者仍负责本地生成客户端、身份和scope使用。
- 运维责任：活动TestRun存储切换、旧非终态记录处置、配对备份/恢复与维护窗口由操作负责人及项目所有者决策；当前记录没有授权执行这些活动变更。
- 人工责任：当前范围人工验收由项目所有者完成，代理不可代签；Ubuntu等实机结果必须在对应环境采集。
- 未关闭责任：所有者映射不关闭Artifact生命周期政策、活动存储切换、OD/旧Run决策、真实主机恢复、Ubuntu或人工签署。P0全V1逐项差异矩阵仍OPEN；本审计只减少V1.1 23条记录的服务候选/责任类型歧义。
