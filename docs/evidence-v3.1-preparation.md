# V3.1 并行准备证据

日期：2026-09-22（Asia/Shanghai）
阶段：V3.1 真实 RD-Agent 小样本实验闭环  
准备结论：`PREPARATION_READY_WITH_BLOCKERS`  
真实阶段结论：`NOT_RUN`

## 已完成的并行准备

| 项目 | 结果 | 证据 |
|---|---|---|
| 小样本输入冻结 | PASS | `fixtures/v3/v3.1/manifest.json`；复用 V1.2 日线和 V2.3 分钟 Fixture，均带 SHA-256 |
| 场景边界冻结 | PASS | manifest 中的 `normal`、`rejection`、`recovery` 断言；不把录制响应当真实模型结果 |
| 现有量化服务类型检查 | PASS | `pnpm --filter @stockquant/quant-research-service typecheck`，退出码 0 |
| 现有量化服务单元测试 | PASS | `pnpm --filter @stockquant/quant-research-service test`，1 个文件、2 个测试通过 |
| V3.1 S0 实验契约 | PASS | `packages/contracts/research/v3.1-experiment.schema.json`，固定 `RESEARCH + FAKE`、轮数上限3和幂等键 |
| research-automation-service 最小纵向切片 | PASS（准备范围） | `services/research-automation-service/`；实验创建/查询/取消、幂等持久化边界和 `/ready` 已实现 |
| 服务类型检查/单元测试/构建 | PASS | `pnpm --filter @stockquant/research-automation-service typecheck`、`test`（10/10）、`build` 均退出0 |
| V3.1 code suite | PASS | `pnpm verify:stage -- --stage V3.1 --suite code`；契约21/21、research 单元5/5、PostgreSQL 集成1/1、platform API 单元27/27、Web 类型检查均通过 |
| 真实 RD-Agent 闭环 | NOT_RUN | 当前服务只执行 V3.1 前置编排和 V1.2/V2.3 兼容边界，不执行真实模型调用 |
| Web V3.1 页面/验收路由 | PASS（准备范围） | `/acceptance/v3/v3.1` 已接入平台 API；Playwright 1/1 实际点击并检查前置检查、LIVE 拒绝、取消与幂等恢复场景 |
| 隔离 Runner | PASS（CPU-only smoke） | `evidence/local/V3.1/runner-image-2026-09-22.json`；Linux amd64 镜像、冻结 RD-Agent/Qlib、无网络/无 Socket/密钥剥离 smoke 通过 |
| TestRun 持久化与复核 | PASS（准备范围） | normal `290a08d0-93cc-4147-a072-a7e1f8bb8f8b`；同一 Run `--check-only` 返回 COMPLETED/PASS，未创建新实验 |
| 取消与幂等恢复 | PASS（准备范围） | recovery `057bc825-9bc5-4b5a-8df5-9e2361dea2b0`；重复幂等键返回同一 experimentId，取消状态为 `CANCELLED` |

## 当前前置门禁

- `OD-009` 整体仍未关闭：RD-Agent source commit、模型 Provider、预算已冻结；凭证、外发限制、原生 Ubuntu 兼容性和控制器接线仍待完成。
- V3.1 的正式研究页面和 Artifact 持久化尚未实现；Runner 任务协议、校验边界和 CPU-only smoke 已建立，实验请求的 PostgreSQL 持久化边界已建立，但不会自行启动 Runner。
- 本轮已在本机 Docker Compose 中启动研究服务、平台 API 和 Web，并完成 V3.1 Web E2E 与 PostgreSQL 集成测试；amd64 Runner 仅完成 Docker Desktop smoke，不等同于原生 Ubuntu 运行通过。
- 真实模型调用、控制器到 Runner 的正式编排、OOM/超时和预算故障仍未运行；当前 Runner smoke 只验证导入、密钥剥离、Socket 缺失和输出写入。
- 当前证据只证明 Fixture/现有量化服务的准备状态，不证明真实模型生成、真实 RD-Agent、沙箱拒绝或资源隔离。

## 下一步可并行执行

1. 配置决策草案已准备：见 [`docs/decisions/OD-009-v3.1-configuration-draft.md`](decisions/OD-009-v3.1-configuration-draft.md)。Provider、模型和预算已确认；外发策略、凭证运行注入和 Runner 兼容性仍需验收，秘密不得写入仓库。
2. 在现有 S0 切片上补齐 TestRun 编排、Artifact 引用和控制器/Runner 端口。
3. 保持 `/acceptance/v3/v3.1` 与同一 TestRun API 的 normal/rejection/recovery 回归，发现持久化或幂等回归时先修复。
4. 以当前 manifest 为输入继续运行无模型的编排/拒绝/恢复测试；获得凭证后再执行真实模型闭环。
5. 在原生 Ubuntu x86_64 重放镜像构建与同一 runtime policy，再执行控制器编排、越权/网络/OOM/超时和预算故障证据。

## 2026-09-21 配置准备复核

| 检查 | 结果 | 证据 |
|---|---|---|
| 研究服务配置校验 | PASS | `RESEARCH + FAKE + LIVE_TRADING_ENABLED=false`；默认 Runner/Model Gateway 为 `NOT_CONFIGURED`；无前置条件时返回 `PENDING_PREREQUISITES` |
| research 单元、契约与文档检查 | PASS | research 单元 10/10；JSON 24 个；Markdown 本地链接 414 个；`git diff --check` 通过 |
| V3.1 code suite | PASS | contracts 24/24、research 单元 10/10、PostgreSQL 集成 1/1、platform API 27/27、Web typecheck |
| Provider/模型决策 | CONFIRMED（准备范围） | Chat=`DeepSeek/deepseek-flash`；Embedding=`SiliconFlow/Qwen/Qwen3-Embedding-4B`；输出维度固定 `1024`；凭证引用名仅记录为 `DEEPSEEK_API_KEY`、`SILICONFLOW_API_KEY` |
| 预算决策 | CONFIRMED（准备范围） | USD；单轮默认 300 cents（$3）；单实验硬上限 1000 cents（$10）；V3.1 阶段总预算 3000 cents（$30）；80% 告警、100% 停止新调用；未知计费请求 `UNKNOWN`，不自动重试 |
| RD-Agent source commit | FROZEN（兼容性门禁未完成） | 官方 `v0.8.0`；完整 commit `274e274d5dbb72cc2ea139d1a7c93d73ce9b1198`；证据 `evidence/local/V3.1/rd-agent-source-v0.8.0.json`；Linux ARM64/Qlib 镜像尚未验证 |
| 目标架构决策 | CONFIRMED（设计范围） | 用户确认 ADR-0007：Mac M1 用于开发/小样本，Ubuntu `x86_64` 用于正式 CPU-only RD-Agent/Qlib 验证；Mac amd64 模拟只作功能烟测，实际 Ubuntu 镜像和资源仍未验证 |
| 重建后运行态 normal 复核 | PASS（准备范围） | `testRunId=754f4322-078b-4c3f-90a0-d54a7720a2f5`；`/ready` 显示上述非秘密配置，Runner/Model Gateway 仍 `NOT_CONFIGURED`，实验仍 `PENDING_PREREQUISITES`，`modelCalls=NOT_RUN` |
| normal 场景 | PASS（准备范围） | `testRunId=661dcfff-cb87-45b9-b8f2-82f6cda6c878`；`PENDING_PREREQUISITES`；`modelCalls=NOT_RUN` |
| rejection 场景 | PASS（准备范围） | `testRunId=311fcacc-b4c5-49b2-8903-30d510718d33`；LIVE 输入返回 422；`modelCalls=NOT_RUN` |
| recovery 场景 | PASS（准备范围） | `testRunId=98952456-b498-4c06-9c7e-e73566aa6a7d`；幂等重复返回同一实验并可取消；`modelCalls=NOT_RUN` |

本次准备新增配置、Runner 任务和 Artifact 引用契约：

- `packages/contracts/research/v3.1-research-runtime.schema.json`
- `packages/contracts/research/v3.1-runner-job.schema.json`
- `packages/contracts/research/v3.1-artifact-ref.schema.json`
- `docs/prd/v3-research-and-ubuntu/v3.1-runtime-preparation.md`

这些证据只证明安全配置门禁、编排、拒绝和恢复准备可用；OD-009 整体仍未关闭，V3.1 真实闭环仍为 `NOT_RUN`。

## 2026-09-22 运行边界实现复核

新增 `v31-runtime-guards`：Runner Job 校验不可变 `sha256` 镜像、`testRunId/experimentId` 隔离 namespace、CPU/内存/超时/PID 正整数资源和 DENY/ALLOWLIST 网络策略；ArtifactRef 校验研究 namespace、输入/输出目录和 SHA-256；BudgetLedger 校验单实验硬上限、阶段预算、80% 警告阈值，并将未知实际费用标记为 `UNKNOWN`，不得自动重试。

| 检查 | 结果 | 证据 |
|---|---|---|
| runtime guard 单元测试 | PASS | research-automation-service 4 个测试文件、15/15；含跨 run、可变 digest、错误 namespace、未知费用和阶段预算耗尽 |
| Runner 校验 HTTP 边界 | PASS（validation-only） | `POST /v1/runner/jobs/validate` 返回 `VALID`、`execution=NOT_STARTED` |
| Artifact 校验 HTTP 边界 | PASS（validation-only） | `POST /v1/artifacts/validate` 返回 `VALID`、`persisted=false` |
| 容器运行门禁 | 仍阻塞 | `/ready` 为 `runner=NOT_CONFIGURED`、`modelGateway=NOT_CONFIGURED`、`PENDING_PREREQUISITES` |

本次只完成可验证的安全边界和预算规则，未声称真实 Runner、真实模型调用、Artifact 持久化或 Ubuntu 运行已通过。

以上准备不修改 V3.1 验收表的人工签署或真实闭环结论。

## 2026-09-22 执行复核

`pnpm verify:stage -- --stage V3.1 --suite code` 继续通过：研究服务类型检查、单元测试 11/11、PostgreSQL 集成 1/1、平台 API 单元测试 28/28、Web 类型检查和契约检查均通过。当前运行配置仍为 `RUNNER_MODE=NOT_CONFIGURED`、`MODEL_GATEWAY_MODE=NOT_CONFIGURED`，所以本次只更新准备范围证据，不改变真实闭环 `NOT_RUN`、OD-009 或人工验收状态。

## 2026-09-22 CPU Runner 镜像复核

`services/research-automation-service/runner/` 新增 CPU-only Runner Dockerfile、70 包哈希依赖锁、冻结版本清单和受限入口。镜像 `sha256:9752c80d5b7a40d6f327888b5d9bca06c0996a1ce7507ce99410b138fe0f169e` 为 `linux/amd64`，基础镜像摘要、RD-Agent `274e274d...`、Qlib `3e72593b...` 和资源策略均记录在 [`runner-image-2026-09-22.json`](../evidence/local/V3.1/runner-image-2026-09-22.json)。

受限 smoke 使用 `--network none`、只读根文件系统、`cap-drop ALL`、`no-new-privileges`、2 CPU、2 GiB、128 PIDs 和 `10001:10001` 用户运行，通过了 Qlib/RD-Agent 导入、Docker Socket 缺失、继承密钥剥离与 V3.1 输出写入。该结果来自 Docker Desktop 的 amd64 模拟，不能替代原生 Ubuntu、真实模型调用或完整 RD-Agent 闭环。

同日新增 `v31-runner-launch` 纯函数适配边界：只接受 `image@sha256`，将任务资源转换为固定 Docker 参数，强制 `linux/amd64`、`network none`、只读根文件系统、无能力、非 root 和输入/输出双挂载；ALLOWLIST、继承密钥、Docker Socket 和任意宿主挂载均被拒绝或不传递。research 单元测试更新为 5 个文件、17/17 通过。该模块只生成无副作用启动计划，尚未把 Docker Socket 接入 API 容器，也未启动真实研究任务。

## 2026-09-21 启动前置审计

| 检查项 | 当前结果 | 后续动作 |
|---|---|---|
| 当前工作区代码门禁 | `pnpm verify:stage -- --stage V3.1 --suite code` 退出 0：契约 24/24、research 单元 11/11、PostgreSQL 集成 1/1、platform API 单元 27/27、Web typecheck PASS | 实现真实 Runner/模型网关后重新运行并补业务证据 |
| 模型与维度运行配置 | 本机 `/ready` 显示 `deepseek/deepseek-flash`、`litellm_proxy/Qwen/Qwen3-Embedding-4B`、1024 维；Runner/Model Gateway 均为 `NOT_CONFIGURED`，状态为 `PENDING_PREREQUISITES` | 在实际调用链验证 Provider 模型映射、返回向量长度和成本 |
| 本地凭证文件 | `.env.local` 有两项非占位 Key，Git 忽略；权限由 `644` 收紧至 `600`；当前研究容器中两项 Key 均未注入（仅检查布尔值，未显示秘密） | 完成模型网关和受控外发后，通过明确的启动入口注入并验证；不能仅凭文件存在视为可调用 |
| RD-Agent 来源与执行镜像 | `/tmp/stockquant-rd-agent-v0.8.0` HEAD 与冻结 commit 一致；当前项目没有 CPU-only RD-Agent Controller/Runner 镜像或 Python 依赖锁 | 构建独立 CPU 镜像，核对 Qlib commit，记录 digest 和目标架构实测 |
| 预算 | 单实验请求上限 1000 cents 已校验；阶段 3000 cents 与 80% 告警目前仅是配置字段 | 完成实际费用流水、未知计费状态、阶段累计限额和停止新调用门禁 |
| 实验与验收 | 服务只登记/查询/取消实验；正式研究页、真实模型→代码→Qlib、Runner 隔离与失败 Artifact 尚未实测 | 完成 V3.1 normal/rejection/recovery 和人工验收；维持 `NOT_RUN` |

本审计只确认本机准备和缺口。当前工作区存在未提交变更；迁移 Ubuntu 前仍需固定可复现代码版本、依赖锁和镜像 digest。
