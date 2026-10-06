# W4 V2.5 当前工作区三场景闭环

日期：2026-10-01（Asia/Shanghai）

## 环境诊断和修复

最初以固定本地后端运行三个 V2.5 场景时，CLI 在 HTTP fetch 阶段失败；请求尚未创建 TestRun。只读 Compose/health检查发现 Platform API 容器已运行但处于 unhealthy，`/ready`返回503。容器内只读诊断确认 PostgreSQL、Portfolio、Trade Execution、Historical Replay Worker readiness 均为200，而 Platform API 容器缺少当前忽略配置 `.env.local` 中已存在的 Platform service Bearer。

只通过项目 Compose 配置重建/替换 `platform-api-service`（`--no-deps`），没有重启其他服务或删除/重置数据库卷。新容器由当前工作树构建，镜像ID `sha256:707b55722611a5e120780bc8c96a1a60097e532f1604050774987f132e5b1cf3`；`GET /ready` 返回 `{"status":"ready","service":"platform-api-service","brokerMode":"FAKE"}`，容器状态 healthy。

## 三场景及同Run核对

固定命令使用 `pnpm verify:stage -- --stage V2.5 --scenario <scenario> --seed 20261001`。所有TestRun均为隔离FakeBroker/Fixture。

| 场景 | TestRun ID | 断言 | 同Run `--check-only` | 脱敏证据Manifest |
|---|---|---:|---|---|
| normal | `4b370296-b2f1-41c5-80ab-96677a9b580c` | 6/6 PASS | exit 0 | [Manifest](../local/V2.5/4b370296-b2f1-41c5-80ab-96677a9b580c/manifest.sha256)，内容SHA-256 `5e461fde907df705f07cb8252324844ea22e3e4d0b81fac7a0ece2b28543036c` |
| rejection | `4907c01c-6aea-46c8-9a1f-8d25580a944f` | 3/3 PASS | exit 0 | [Manifest](../local/V2.5/4907c01c-6aea-46c8-9a1f-8d25580a944f/manifest.sha256)，内容SHA-256 `6ebe39075e4fff0632d42417e89b7eec8660c4245038f93811e3eccad95a3572` |
| recovery | `bb4ea149-3d83-4591-a0ca-c9b6bd2a2458` | 3/3 PASS | exit 0 | [Manifest](../local/V2.5/bb4ea149-3d83-4591-a0ca-c9b6bd2a2458/manifest.sha256)，内容SHA-256 `555136ceb89ad0dede5fd5092f040adf234abadb141fc03434dee521e9fbd982` |

V2.5 normal覆盖20证券×60会话的1,200行固定Fixture、扩容前后结果Hash一致、时序切分无未来行、分区查询、DataVersion缓存隔离和资源测量（224 MiB、Linux/amd64仿真）。rejection覆盖并发上限、缓存版本冲突、预算超限且无半成品发布。recovery覆盖在第640行断点恢复、1,200行无重复、取消不发布半成品且保留证据。

导出通过项目 `/api/v1/session` 为 `acceptance-owner-1` 获取本地短期 `sq_session`，Cookie未写入输出或证据；随后对每个同一TestRun调用 `pnpm evidence:export -- --stage V2.5 --run <id>`。三份证据位于忽略的 `evidence/local/V2.5/<testRunId>/`。

## 边界

测试架构为 Linux/amd64 仿真；V2.4观察字段仍为 `V2.4_20_TRADING_DAYS_PENDING`。本记录不证明真实市场来源或研究授权、真实PIT、分钟全市场容量、长期源稳定性、60交易日备用源、V2.5新范围人工确认或版本整体完成。真实来源授权仍保持关闭，LIVE交易保持禁用。
