# W4 V2.3 Qlib Fixture Artifact 持久化审计

日期：2026-10-01（Asia/Shanghai）。本工程增量补齐合成 Qlib Fixture TestRun 的业务 Artifact 持久化；不触发外部行情、真实模型 Provider 或 Broker。

- Qlib Worker 返回有界模型文件及测试预测向量，并提供预测 canonical JSON；Platform 检查 Base64 往返、模型 SHA-256、预测 SHA-256、数量与有限值。
- Platform 将规范化模型/预测载荷持久写入独立 PostgreSQL `qlib_fixture_artifacts` 表，按内容 SHA 作为不可变 artifactId，并将 ArtifactRef 与同一 TestRun 关联。
- 新增 OpenAPI owner-scoped Artifact GET，读取前检查 TestRun 所属及 Artifact owner，并在返回前重算内容 SHA；Web 页面提供带会话的下载链接。
- 隔离 Chromium → Platform → Quant Research → Qlib Worker → PostgreSQL 实际测试通过。最新全量复验TestRun `bf32f747-0339-40f6-bb53-37a4401fa1bf`；Artifact SHA-256 `24864d22e4016e1419382e380aec504f02607004262696c92b76451cc1dbb6a8`；TestRun脱敏导出 Manifest SHA-256 `c9edc81524861023f954fe337d4d526894bf5653c705a3ad10014e6709b7d406`；离线Bundle包含TestRun JSON与Artifact两个条目。
- Artifact owner读取 200，foreign owner 403；V2.3 `--check-only`退出0且TestRun/Artifact库前后完全相同；证据导出不改变两者；随机数据库、临时Worker容器和镜像已清理。
- 完整 `pnpm verify:stage -- --stage V2.3 --suite code`退出0。包括文档/契约/Fixture、全仓build/lint/typecheck/unit、Python Adapter 63项、Ops 155项、服务与数据库集成、Qlib smoke及上述Web HTTP E2E。

边界：仅为合成Fixture Artifact；不证明真实/获授权市场数据、PIT、独立模型验证、盈利能力、Ubuntu或V2.3新增能力人工签署。用户已确认NO_TRADE且暂无数据源授权，未启用采集或Paper。


离线导出补充：V2.3导出命令从owner-scoped ArtifactRef读取Artifact、校验TestRun/owner/content address及canonical payload SHA，将`qlib-fixture-artifact.json`与`evidence.json`共同列入SHA-256 Manifest。路径注入/篡改、TestRun绑定、双文件Manifest测试8/8通过；随后完整V2.3 suite/Chromium HTTP导出复验通过，实际导出两个受SHA-256 Manifest保护的JSON文件。
