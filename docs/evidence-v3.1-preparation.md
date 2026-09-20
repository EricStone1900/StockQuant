# V3.1 并行准备证据

日期：2026-09-20（Asia/Shanghai）  
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
| V3.1 code suite | PASS | `pnpm verify:stage -- --stage V3.1 --suite code`；契约、research 服务 4/4、platform API 27/27、Web 类型检查均通过 |
| 真实 RD-Agent 闭环 | NOT_RUN | 当前服务只执行 V3.1 前置编排和 V1.2/V2.3 兼容边界，不执行真实模型调用 |
| Web V3.1 页面/验收路由 | PASS（准备范围） | `/acceptance/v3/v3.1` 已接入平台 API，提供前置检查、LIVE 拒绝、取消与幂等恢复场景 |
| 隔离 Runner | BLOCKED | 当前没有 V3.1 Runner 镜像或资源策略 |

## 当前前置门禁

- `OD-009` 仍为 `OPEN`：RD-Agent 固定 source commit、模型 Provider、预算、外发限制和凭证引用方式尚未确认。
- V3.1 的正式研究页面、Artifact 引用和 Runner 协议尚未实现；当前验收页面和 TestRun 准备编排已建立，实验请求的 PostgreSQL 持久化边界已建立，但不会自行启动 Runner。
- 本机 Docker 守护进程当前不可由受限会话访问，因此本轮没有声称容器化 RD-Agent/Qlib 运行通过。
- V3.1 Web E2E 和 PostgreSQL 集成测试尚未运行；前者需要启动包含新服务的 Compose/Web，后者需要 `RESEARCH_AUTOMATION_DATABASE_URL`。
- 当前证据只证明 Fixture/现有量化服务的准备状态，不证明真实模型生成、真实 RD-Agent、沙箱拒绝或资源隔离。

## 下一步可并行执行

1. 冻结 OD-009，并记录 Provider、模型标识、预算上限、外发策略和凭证引用名；秘密不得写入仓库。
2. 在现有 S0 切片上补齐 TestRun 编排、Artifact 引用和控制器/Runner 端口。
3. 在 Web 中实现 `/acceptance/v3/v3.1` 与同一 TestRun API 的 normal/rejection/recovery 场景。
4. 以当前 manifest 为输入，先做无模型的编排/拒绝/恢复测试；获得凭证后再执行真实模型闭环。
5. 在目标 Linux 容器中构建并验证固定 RD-Agent、Qlib 和 Runner 镜像，记录 digest、资源限制和权限拒绝证据。

以上准备不修改 V3.1 验收表的人工签署或真实闭环结论。
