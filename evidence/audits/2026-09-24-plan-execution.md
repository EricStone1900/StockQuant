# 2026-09-24 计划执行记录

## 已执行

- V2.4 日终观察计数增加盘中质量门禁：至少10个有效采样事件、至少1个执行窗口、采样事件无错误且每次行情存在有效时间戳、数据新鲜度正常。
- Python 适配器统一测试入口切换为 pytest，统一入口覆盖全部测试文件。
- TDX 适配器增加有界分页读取：最多32页，按最早时间戳达到请求起点或重复页停止；保留旧版单次请求 API 兼容路径。
- DC-08A 启用守卫定时任务延长至2026-10-30，覆盖当前剩余交易日观察窗口。
- 同步 V2 计划、验收记录和 V2.4 testRunId 证据；保留历史观察事件和原始失败记录。

## 验证证据

- `pnpm --filter @stockquant/platform-api-service typecheck`：PASS。
- `pnpm --filter @stockquant/platform-api-service test`：28/28 PASS。
- `pnpm test:python-adapter`：53/53 PASS。
- `uv run --project services/market-data-adapter --frozen ruff check services/market-data-adapter`：PASS。
- `uv run --project services/market-data-adapter --frozen mypy services/market-data-adapter/src`：PASS。
- platform-api-service 镜像已重建并重启；依赖服务补齐后 `/ready` 与 `pnpm v24:preflight` 五项均 PASS。
- 新容器实际读取 V2.4 观察汇总仍为 `WAITING`、8/20、剩余12日；历史有效天数保持不变。
- 正式20只证券名单的 TDX 上午和收盘只读复核均 PASS，分别960行、退出码0；证据为 `tdx-shadow-auto-recheck.json` 与 `tdx-shadow-auto-recheck-pm.json`。
- TDX 探针新增独立完整性摘要：按 `morning`/`full` 窗口逐证券检查预期Bar、缺口、重复、异常时间和异常行；自动化提示已分别传入对应窗口。
- DC-08A 巡检新增到期检查，当前守卫剩余36天，提前10天返回告警码2。
- V3.1 HTTP准备验证：Runner提交返回202/QUEUED/NOT_STARTED，状态查询200；Artifact发布返回201/PUBLISHED，内容SHA-256校验通过。真实Runner和模型均未启动。
- V3.1 持久化复核：研究服务重建后，`pg-persistence-run:pg-exp-1` 以 `QUEUED` 状态提交；容器重启后 GET 仍返回相同 `jobId`、提交时间和 `QUEUED` 状态。PostgreSQL 查询返回 `research_runner_jobs|QUEUED` 与 `research_artifact_refs|pg-persistence-log|PUBLISHED`；命名卷文件 SHA-256 为 `779817dc9625c53818afbc27f919d69200ec45998dc6fb9b6d8c5c31a0b336d0`。真实 Runner 和模型仍未启动。
- V3.1 TestRun 编排验证：平台验收接口 normal `testRunId=71364847-c4c2-43cb-a8d5-a7de500dc2dd` 与 recovery `testRunId=9cfdafb1-0efb-4907-97f8-03160cae96c2` 均完成 Experiment、输入 ArtifactRef 发布和 Runner Job 提交；两个 Runner Job 均为 `QUEUED/NOT_STARTED/PENDING_PREREQUISITES`，recovery 同时验证重复 Experiment 幂等和取消。rejection `testRunId=4a72999e-6fc3-48d6-b009-62836a9f35c3` 的 LIVE 输入仍返回预期拒绝。以上使用本地平台 API 容器临时加载本地编译 `dist` 完成；正式平台镜像构建仍受 npm registry 慢速下载阻塞，未将临时容器视为镜像发布证据。
- V3.1 Web/CLI 同一 Run 复核：结构化 Web 页面 E2E 1/1 通过，显示 Experiment、Artifact、Runner、执行和前置条件字段；`pnpm verify:stage -- --stage V3.1 --run 71364847-c4c2-43cb-a8d5-a7de500dc2dd --check-only` 返回0，复核同一 TestRun 的两条 PASS 断言。
- V3.1 受控 Runner 边界复验：`pnpm v31:runner-smoke` 返回 `PASS`，normal=`exit 0`、timeout/path-rejection=`exit 2`、OOM=`exit 247`；research 单元 27/27 通过，执行器额外覆盖 `OUTPUT_LIMIT`。该 smoke 是 Mac Docker Desktop 的 amd64 仿真，不等同于 Ubuntu 正式运行或真实 Runner 接线。
- V3.1 Runner 生命周期回写：HTTP 作业 `lifecycle-http-run:lifecycle-exp-1` 经 `QUEUED → RUNNING → COMPLETED` 后重启服务仍读回 `stdout=runner-complete`；`lifecycle-failure-run:failure-exp-1` 保留 `TIMED_OUT/SIGKILL` 和 stderr；已完成作业重复 start 返回422，8 MiB+1 输出返回422。对应测试 job 已从 PostgreSQL 精确清理。
- V3.1 Artifact 关联与 retry：FAILED 作业 `artifact-lifecycle-run:artifact-exp-1` 绑定已发布 RUN_LOG，结果保留 `qlib evaluation failed`；retry 生成 `artifact-lifecycle-run:artifact-exp-1:retry-2`（`attempt=2`、`retryOf` 原作业），重复 retry 幂等，重启后仍可查询。对应测试 Job、ArtifactRef 和命名卷文件已精确清理。
- V3.1 门禁失败历史与修复：一次重复 Web E2E 因准备场景累计占满 3000 cents 阶段预算而失败，暴露平台 API 未检查 Experiment 失败响应并继续构造 `undefined` namespace；已增加响应错误保护，精确清理 8 条未纳入正式证据的测试预留/Experiment/Artifact，随后 Web E2E 重新返回 PASS。该历史失败不覆盖之前的正常证据。
- 平台正式镜像部署复核：详细 Docker 构建显示 `pnpm install --frozen-lockfile` 需要下载309个包，多个 tarball 平均速度仅8–46 KiB/s，但最终在55.9秒完成；平台镜像构建成功并生成 `sha256:67915bdb5de50ca2b7eb5f5b70c3a471110bd8ed0f7d10033a422f7318c98fcd`。随后使用 `--no-build --force-recreate` 重建平台 API，运行容器与该镜像摘要一致，`/ready` 返回 `status=ready`，V3.1 code suite 为 research 单元33/33、集成4/4、platform单元28/28，Web E2E 1/1。该次构建仍受冷缓存和 registry 低吞吐影响，Dockerfile 尚未加入 pnpm BuildKit 缓存挂载。
- Docker 构建缓存优化复核：平台 API 与市场数据 Dockerfile 均加入 `docker/dockerfile:1.7` 和共享 `stockquant-pnpm-store` BuildKit cache mount。首次冷缓存构建成功；市场数据构建第二次安装层显示 `reused 306, downloaded 3`，证明 pnpm store 可复用。平台 API 正常缓存构建命中安装层并完成镜像导出；平台 API 重新部署后 `/ready` 为 `ready`，基线检查（Markdown 447/0、JSON 24/0、Fixture 10/0）、V3.1 code suite（research 33/33、集成4/4、platform 28/28、Web typecheck）和 Web E2E 1/1 全部通过。

## 仍待真实运行

- 两个 TDX 复核使用了定时任务的正式命令和正式20只名单，但由受控本机命令触发；下一实际交易日仍需保留由调度器自动触发的原始运行证据。
- TDX 60交易日能力和独立历史数据完整性仍未宣称支持。
- TDX 60交易日窗口、备用免费源长期稳定性和V3.1真实模型链路仍未完成。
