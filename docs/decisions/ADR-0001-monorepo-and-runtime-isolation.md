# ADR-0001：Monorepo 与运行时隔离

- 状态：Accepted
- 日期：2026-09-08
- 适用范围：V1～V3

## 背景

平台同时包含 TypeScript Web/领域服务、Python 数据/量化服务、Qlib 与 RD-Agent。它们的依赖和安全边界不同，但契约、Fixture、测试和阶段证据需要在同一代码版本下追踪。

## 决策

1. 使用单一 Git Monorepo。Web 放在 `apps/`，领域服务放在 `services/`，契约源文件放在 `packages/contracts/`，基础设施放在 `infra/`。
2. Node 工作区使用 pnpm；Python 服务使用各自的 `pyproject.toml` 与 `uv.lock`，不设置全仓共享虚拟环境。
3. Qlib 位于量化服务 Adapter，RD-Agent 位于研究自动化服务；两者允许不同 Python 与数值库版本。RD-Agent 控制器与生成代码 Runner 再分离。
4. V1.1 只创建 Web、platform-api-service、portfolio-risk-service、公共契约和 core 基础设施所需切片。其他服务在其首个阶段到来时建立，不生成十二个空服务冒充进度。
5. 开发启动基线固定 Node 24.1.0 与 pnpm 10.34.5；其他精确 Python、框架、Qlib/RD-Agent commit 和镜像版本由锁文件、镜像 Digest 与兼容探针冻结。pnpm 12.3.4 与本机现有 Corepack 启动格式不兼容，未采用。未验证项登记为未决，不能使用浮动 `latest` 作为交付证据。

## 影响

跨语言变更需要契约兼容检查。不同 Python 服务会有重复环境开销，但避免 Qlib/RD-Agent 依赖互相污染，也禁止将 macOS `.venv` 或编译库迁移到 Linux。

## 验证

V1.1 验证 pnpm/uv 工作区、容器构建和生成契约；V1.2 验证真实 Qlib；V3.1 验证真实 RD-Agent。对应检查未执行前保持 `NOT_RUN`。
