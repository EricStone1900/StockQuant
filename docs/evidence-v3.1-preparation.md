# V3.1 并行准备证据

日期：2026-09-21（Asia/Shanghai）
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
| 服务类型检查/单元测试/构建 | PASS | `pnpm --filter @stockquant/research-automation-service typecheck`、`test`（2/2）、`build` 均退出0 |
| V3.1 code suite | PASS | `pnpm verify:stage -- --stage V3.1 --suite code`；契约21/21、research 单元5/5、PostgreSQL 集成1/1、platform API 单元27/27、Web 类型检查均通过 |
| 真实 RD-Agent 闭环 | NOT_RUN | 当前服务只执行 V3.1 前置编排和 V1.2/V2.3 兼容边界，不执行真实模型调用 |
| Web V3.1 页面/验收路由 | PASS（准备范围） | `/acceptance/v3/v3.1` 已接入平台 API；Playwright 1/1 实际点击并检查前置检查、LIVE 拒绝、取消与幂等恢复场景 |
| 隔离 Runner | BLOCKED | 当前没有 V3.1 Runner 镜像或资源策略 |
| TestRun 持久化与复核 | PASS（准备范围） | normal `290a08d0-93cc-4147-a072-a7e1f8bb8f8b`；同一 Run `--check-only` 返回 COMPLETED/PASS，未创建新实验 |
| 取消与幂等恢复 | PASS（准备范围） | recovery `057bc825-9bc5-4b5a-8df5-9e2361dea2b0`；重复幂等键返回同一 experimentId，取消状态为 `CANCELLED` |

## 当前前置门禁

- `OD-009` 仍为 `OPEN`：RD-Agent 固定 source commit、模型 Provider、预算、外发限制和凭证引用方式尚未确认。
- V3.1 的正式研究页面、Artifact 引用和 Runner 协议尚未实现；当前验收页面和 TestRun 准备编排已建立，实验请求的 PostgreSQL 持久化边界已建立，但不会自行启动 Runner。
- 本轮已在本机 Docker Compose 中启动研究服务、平台 API 和 Web，并完成 V3.1 Web E2E 与 PostgreSQL 集成测试；这不等同于容器化 RD-Agent/Qlib 真实运行通过。
- 真实模型调用、Runner 沙箱和资源隔离仍未运行；当前环境只验证编排、边界拒绝、持久化和取消恢复。
- 当前证据只证明 Fixture/现有量化服务的准备状态，不证明真实模型生成、真实 RD-Agent、沙箱拒绝或资源隔离。

## 下一步可并行执行

1. 冻结 OD-009，并记录 Provider、模型标识、预算上限、外发策略和凭证引用名；秘密不得写入仓库。
2. 在现有 S0 切片上补齐 TestRun 编排、Artifact 引用和控制器/Runner 端口。
3. 保持 `/acceptance/v3/v3.1` 与同一 TestRun API 的 normal/rejection/recovery 回归，发现持久化或幂等回归时先修复。
4. 以当前 manifest 为输入继续运行无模型的编排/拒绝/恢复测试；获得凭证后再执行真实模型闭环。
5. 在目标 Linux 容器中构建并验证固定 RD-Agent、Qlib 和 Runner 镜像，记录 digest、资源限制和权限拒绝证据。

以上准备不修改 V3.1 验收表的人工签署或真实闭环结论。
