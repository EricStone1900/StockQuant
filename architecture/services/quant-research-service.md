# 量化研究、策略与回测服务

服务：`quant-research-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：Python / FastAPI + CPU计算Worker / Qlib Adapter。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.2因子/策略；V1.4日线回测；V2.3分钟回放；V2.5模型验证；V3.2候选复算。

唯一拥有：历史股票池、Factor/Model/Strategy Registry、参数/验证报告、分析/目标快照、Backtest/Replay Manifest、研究结果及Outcome。

边界：不创建真实执行订单，不改账户账本或Mandate；回放只能调用执行/治理/组合端口，不独占另一套交易规则。

## 2. 内部分层

domain：股票池、因子定义、策略版本与晋升、运行清单；application：因子/模型/策略运行、回测、候选复算；ports：数据/组合快照、执行回放/治理、Artifact/Clock；adapters：Qlib、DB、对象存储；bootstrap：API、计算Worker。

目标目录：`services/quant-research-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：universe_versions、factor/model/strategy_versions、validation_runs、strategy_snapshots、research_runs、replay_manifests/checkpoints、outcomes、artifact_refs。模型/矩阵/代码/净值大产物在对象存储。

事务/幂等：运行键绑定数据/代码/参数/时钟/规则Hash；Registry按expectedVersion变更；发布指针、运行终态、Outbox同事务；生成文件Hash与规范数值Hash分开。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| POST /internal/v1/strategy-runs | 固定输入/市场/组合/策略，返回202/runId。 |
| GET /api/v1/runs/{id} | 运行进度、模式/执行模型、输入Manifest、结果/失败与取消状态。 |
| POST /api/v1/strategies/{id}/versions/{v}/validate、/approve、/activate、/suspend | 独立复算和精确版本授权；研究身份不能执行approve/activate。 |

只读市场数据Artifact、组合快照；治理消费目标快照；回放通过受控端口驱动交易链路；研究服务提交PromotionRequest。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：发布stock.quant.strategy-snapshot.published.v1、stock.quant.outcome.evaluated.v1；消费固定数据版本用于任务触发。

1. 冻结数据/股票池/预热和训练验证测试窗口，按asOf过滤。
2. Qlib计算特征/模型/目标权重，NO_TRADE保持空交易腿。
3. 回测固定执行模型；历史Worker按事件屏障推进，通过真实服务小样本核验共享规则。
4. 完整结果原子发布；候选复算合格后由用户批准版本，交治理形成模拟授权。

## 6. 故障、权限与恢复

OOM/取消不发布半报告；旧快照可读但陈旧；不把LLM重生成随机性作为固定代码复算不一致的理由。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

Python / FastAPI + CPU计算Worker / Qlib Adapter组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

因子/策略、回测净值/成交/费用、分钟回放控制、候选比较/批准；VT04/06/07。

测试映射：T08～14、T33；手算/无未来泄漏、成本/公司行动一致性、恢复无重复、样本外及独立批准。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

实现复核补充（2026-09-25）：量化研究API要求平台或历史回放服务Bearer。历史回放身份仅能调用`POST /v1/research/multi-bar`；平台身份可调用`/v1/`研究接口，健康探针保持可用。两个身份要求不同且各不少于32字符。路由策略单测和服务构建通过；服务HTTP鉴权烟测及活动部署仍未执行。

候选审批持久化边界（2026-09-25）：既有`POST /v1/research/candidates`只接受固定Qlib版本/算法/Artifact Hash；现在以候选ID作为不可变键，完全相同的并发请求返回幂等重放，不同审批人/内容返回409，不再使用`ON CONFLICT DO UPDATE`覆盖批准者。运行时请求拒绝未知字段与无效ID；请求/响应已加入canonical Schema、Fixture、兼容规则、生成类型和`quant-candidate.v1` OpenAPI。激活字段仍固定`DISABLED_UNTIL_MANDATE`。13项服务单测及临时隔离PostgreSQL真实HTTP smoke通过。该接口属于既有候选登记，不是V3.2 PromotionRequest复算/Registry流程；V3.2业务API与人工审批闭环仍NOT_RUN。

## V3.2 contract preparation (2026-09-25)

The shared `v3.2-promotion-request-v1` contract now describes the exact candidate Artifact, code/data/metrics/validation-plan hashes, budget allocation reference and idempotency identity submitted by research for independent recomputation. It does not give research Registry write authority or mark a candidate approved/active. Quant-side recomputation and Registry ownership remain unimplemented and NOT_RUN.

## 2026-09-25 PromotionRequest intake API

`POST /v1/promotions` accepts only the canonical V3.2 request and persists an immutable JSONB snapshot, canonical SHA-256 fingerprint, unique request ID/idempotency key and status constrained to `AWAITING_INDEPENDENT_VALIDATION`. Identical concurrent retries are idempotent; a reused key with changed content or a request ID bound to another key returns 409. The optional `STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION` caller identity is a distinct 32-character-minimum Bearer token scoped to this POST only. Platform identity may GET a request by ID but cannot submit it. The intake does not execute recomputation or mutate Registry/approval/activation. Verified by 20 unit tests and isolated random-database HTTP integration tests. The research producer and V3.2 validation/Registry workflow remain NOT_RUN.

## 2026-09-26 Bearer identity correction

The quant service now derives the caller by matching the supplied Bearer token against its configured per-service credentials. `x-stockquant-service-id` is optional and, when present, must match the token-derived caller; it cannot select a credential. Route scopes continue to follow the derived identity. Focused unit tests (21/21), build, and isolated PostgreSQL integration tests pass. A cross-service HTTP smoke was extended to verify header-free Bearer access and mismatched-header denial; active deployment remains unverified.

PromotionRequest read boundary follow-up (2026-09-26): `GET /v1/promotions/{promotionRequestId}` now requires exactly one path segment and validates UUID syntax before the PostgreSQL query. Malformed UUID returns 422; nested paths return 404. Isolated HTTP/PG integration verifies the service remains responsive and does not alter the persisted request. This remains intake hardening; recomputation and Registry ownership are not implemented.

## 2026-09-27 Qlib Worker dependency evidence

The Qlib Worker image now installs exact package versions from `services/quant-research-service/qlib-worker-requirements.lock`, defaults to the official PyPI index (with a build-time index override), and records the Qlib v0.9.6 source commit `5a84aaf1dc402232646ad2836dea33ff15886552`. A clean disposable Docker build and runtime `/probe` passed on the repository's `linux/amd64` target; `pip check` passed, and an in-memory synthetic `LGBModel.fit`/`predict` smoke produced 24 finite predictions. This is package/runtime engineering evidence only: no frozen market fixture, persisted worker job, candidate report, or V2.3 business acceptance was exercised. The lock pins versions but does not yet enforce hashes for every artifact; the currently running worker was not rebuilt or restarted, and live deployment verification remains NOT_RUN.

2026-09-27 producer preparation: versioned data-manifest and validation-plan sidecar contracts now exist. Quant intake treats their hashes as immutable request references; it does not fetch sidecars or datasets, verify content provenance, or recompute a candidate. Independent validation and Registry transition remain unimplemented.

2026-09-27 fixed-Fixture increment: the Quant Research service now runs an in-process deterministic reference recomputation for the allowlisted 5/20 SMA synthetic fixture and builds evidence-bearing PIT/OOS/cost/rules/capacity checks. It does not execute candidate source, load persisted PromotionRequest ArtifactRefs, run Qlib/isolated Runner work, or support arbitrary/real candidates. Its `ELIGIBLE_FOR_REVIEW` Fixture report is not a persisted business run or approval; production independent recomputation and Registry transition remain `NOT_RUN`.

2026-09-27 report persistence increment: `POST /v1/promotions/{promotionRequestId}/validation-report` accepts a hash-verified immutable report only from the separately configured `quant-validation-worker` Bearer identity; the platform may read it. The transaction binds report/TestRun/source mode to the locked PromotionRequest, supports identical replay, and leaves the request status and Registry unchanged. Isolated PostgreSQL/HTTP smoke and full V3.2 code suite pass. The endpoint currently stores supplied evidence; it does not mean the worker produced it. Actual isolated Qlib recomputation, Web/CLI business TestRun, V3.1 prerequisite, approval and Registry flow remain `NOT_RUN`/`NOT_PERFORMED`.

2026-09-27 report contract alignment: every validation check, including FAIL and NOT_RUN, must carry a content SHA-256 for its explanatory evidence. The report builder, persistence parser and JSON Schema now agree; an unrun check stays NOT_RUN even when its reason is hashed. Contract generation, baseline checks and full V3.2 code suite pass. No absent evidence is inferred or fabricated.

2026-09-27 fingerprint stability: PromotionRequest, evidence and validation-submission fingerprints share one canonical JSON serializer with locale-independent ECMAScript key ordering. A mixed-case/Unicode ordering regression test, concurrent immutable-report replay smoke and full V3.2 code suite pass. Existing stored records are immutable; this code change does not rewrite them.

2026-09-27 Qlib Fixture Fit route: `POST /v1/research/qlib/fit-fixture` is scoped to the platform API caller and proxies a maximum 1 MiB explicit-FIXTURE payload to Worker `/qlib/fit-fixture`. The inter-service hop uses its own `STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE` Bearer token and matching service ID; it is independent from inbound Platform and validation-worker credentials. Contract/OpenAPI/Fixture and generated types are checked. The Worker fits Qlib 0.9.6 `LGBModel` and predicts the test segment, but returns modelValidation=NOT_RUN and never executes candidate source. No frozen market source, PIT proof, persisted run, deployment, or human acceptance has been performed. See [V2.3 Qlib Fixture Fit endpoint audit](../../evidence/audits/2026-09-27-v23-qlib-fit-endpoint.md).

## 2026-09-27 exact V3.2 version decision

`POST /v1/promotions/{promotionRequestId}/decision` is Platform-Bearer-only. Platform first resolves the immutable request and report, proves the local session owns its normal V3.1 source TestRun and that the exact source run has PASS plus persisted user acceptance, then sends the actor from session context and the report fingerprint. Quant locks the request and immutable report in one PostgreSQL transaction, rejects stale/mismatched fingerprints and disallows APPROVE unless all five required checks are PASS. One immutable APPROVE or REJECT is allowed per PromotionRequest; identical retries replay and different decisions conflict. Approval records the exact request/report/candidate/code/data/metrics/validation-plan version fingerprint in Quant's `promotion_registry_versions`; the candidate remains `DISABLED_UNTIL_MANDATE`. Detail reads derive lifecycle status without rewriting the immutable intake row: report persisted → `AWAITING_REVIEW`, incomplete/rejected report → corresponding terminal check state, exact APPROVE → `CANDIDATE_APPROVED`, explicit REJECT → `REJECTED`. A changed request or report necessarily has a different fingerprint and cannot reuse the old approval. No activation or Mandate mutation route is exposed. The random-database HTTP smoke uses synthetic Fixture request/report data only; it does not prove the validation worker generated the report, a real candidate was independently recomputed, or that downstream Mandate consumers enforce the new fingerprint. Those business/runtime checks remain NOT_RUN.

## 2026-09-27 exact Registry lookup

`GET /v1/registry/versions/{versionFingerprint}` accepts the Platform API and Decision Governance Bearer identities. It resolves only an exact 64-character SHA-256 fingerprint and returns the immutable candidate Artifact ID/namespace/hash, code/data/metrics/validation-plan hashes, approver and fixed `CANDIDATE_APPROVED` / `DISABLED_UNTIL_MANDATE` values. Unknown fingerprints return 404. It is a read-only lookup; it grants no activation. Governance now consumes it for the owner/session-gated candidate Mandate binding assessment; Paper does not yet consume it. The response is covered by a versioned schema/OpenAPI/compatibility rule, and random disposable PostgreSQL/HTTP integration proves exact readback, unknown-version 404 and Research Automation denial. A synthetic approved row is used only inside the dropped integration database.

Governance exact-read scope (2026-09-27): the same lookup now also accepts a distinct optional `decision-governance-service` Bearer, still for this GET route only. Quant rejects that caller on PromotionRequest, report, decision, Qlib, and other read routes. A random-PG/HTTP smoke verifies Governance's independent token retrieves the exact approved record while Research Automation is denied. Registry facts remain immutable and disabled.

## 2026-09-27 one-shot V3.2 validation Worker process

Quant exposes `GET /v1/promotions/{promotionRequestId}/validation-input` only to a separately configured `quant-validation-worker` Bearer identity. The route returns the immutable request payload and stored fingerprint; Platform and Governance are denied this route. The Worker identity can read only this input route and submit the existing immutable report route; it cannot read reports, detail, Registry, or other request endpoints.

The repository's one-shot `scripts/v32-independent-validation-worker.mjs` reads the request over HTTP and launches the fixed evaluator in an exact-image-ID Linux/ARM64 container with no network, read-only root and mounts, non-root UID, dropped capabilities, no-new-privileges, and explicit memory/CPU/PID limits. The Worker Bearer stays only in its host controller process; the evaluator returns a request-bound result for strict parsing before the controller submits the report over HTTP. Integration tests launch it against a random disposable PostgreSQL database and assert the evaluator isolation settings. Only the trusted reference evaluator for the explicitly allowlisted Fixture runs; candidate-provided source and Qlib are not executed. Contracts, OpenAPI, compatibility rules, generated types, auth tests and full V3.2 code suite pass. Real candidate validation, deployed candidate-code execution boundary, actual V3.1 prerequisite, formal V3.2 TestRun and human acceptance remain NOT_RUN.

2026-09-27 candidate execution follow-up: the Worker now verifies the frozen manifest, exact candidate artifact SHA-256 and exact allowlisted SMA Python source before launching a second restricted Linux/ARM64 container. That container executes only this fixed source and emits 70 decisions; a separately restricted evaluator requires complete unique date/index-bound output, independently recomputes every reference signal, and uses the candidate decisions for OOS trades. A mismatch fails RULES; missing/duplicate decisions fail RULES/OOS. The candidate Python image is pinned to `sha256:829cc065f506a60d332260af9fc48c590d60cfeff8bfc20df57b7baf20edb879`; it has no network, read-only root/input, UID 65532 and the same 256 MiB/1 CPU/64 PID controls. Integration verifies both containers and cleanup; 10 focused TypeScript tests and Quant integration pass. This corrects the preceding paragraph's statement: the frozen Fixture `sourceCode` now executes. Arbitrary/real candidates and Qlib remain NOT_RUN; V3.1 prerequisite, formal V3.2 business workflow and human acceptance remain NOT_RUN.

2026-09-27 submitted-artifact retrieval integration: the one-shot validation controller now reads the exact candidate bytes from Research Automation's Worker-only route using the dedicated validation Bearer. It validates PromotionRequest ID, OUTPUT/PUBLISHED ref, namespace, SHA and content bytes, writes the bytes to a private temporary file, and mounts that file read-only into both the candidate executor and independent evaluator. The synthetic integration mock serves the same versioned response contract; the Research Automation random-PG HTTP smoke separately proves that the real route opens only after a synthetic accepted gate and successful submission. The current executor still requires those downloaded bytes to be byte-identical to the frozen SMA Fixture, so RD-Agent/user candidate execution and Qlib remain NOT_RUN. See [candidate Artifact delivery audit](../../evidence/audits/2026-09-27-v32-worker-artifact-fetch.md).
