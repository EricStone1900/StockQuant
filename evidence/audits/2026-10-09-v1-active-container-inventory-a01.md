# V1 活动 Compose 资源只读清单（A01）

日期：2026-10-09。范围：读取 Docker 中 `stockquant-v12` Compose 项目容器标签、镜像标识、状态、挂载和两个命名卷元数据；仅读取 Platform API 的 `STOCKQUANT_V11_RUN_STORAGE` 环境项。未读取数据库表/Artifact内容、未输出任何凭据，未启动、停止、重建或修改容器/卷。

原始只读输出：[inventory log](./2026-10-09-v1-active-container-inventory-a01.log)，SHA-256 `a82f33b469d29dd34299fa3145a058062d010fa977422f34c469c7cbf1d46dfb`。

## 当前观察

- `stockquant-v12` 项目有13个运行中容器，Platform API、PostgreSQL、Portfolio、Trade、Governance、Market Data、Replay、Quant等健康；Research Automation、Web、Temporal、NATS和Qlib Worker也在运行。该状态仅是Docker健康信息，不证明应用验收或业务状态正确。
- Platform API容器镜像ID为`sha256:77c1521a431b7012b8a18815e5924d962e20cd1b5dbd6a975e47a97f18c71513`，创建于`2026-09-30T16:16:33.926446094Z`，Compose项目工作目录为`infra/compose`。它的实际挂载列表为空，运行配置为`STOCKQUANT_V11_RUN_STORAGE=legacy`，没有显式设置`STOCKQUANT_ARTIFACT_CONTENT_ROOT`。
- PostgreSQL容器实际使用`stockquant-v12_postgres-v11`卷挂载到`/var/lib/postgresql/data`；Research Automation实际使用`stockquant-v12_research-artifacts-v1`卷挂载到`/var/lib/stockquant/research-artifacts`。
- 当前仓库`infra/compose/docker-compose.yml`已为Platform API和Research Automation都声明`research-artifacts-v1:/var/lib/stockquant/research-artifacts`。但运行中的Platform容器没有任何挂载。Platform源码在未设置Artifact root时回退到同一路径，因此运行容器内的该路径当前不由已检查的持久命名卷承载；未读取文件系统，不能断言该目录中是否有内容。

## 对切换准备的影响

这是运行实例与当前Compose声明的配置漂移。Platform TestRun仍走legacy存储；Artifact字节的运行时持久性不能由Research Automation的卷挂载推定。不得按当前Compose文件假定实际挂载、不得开始V1.1 TestRun存储切换或配对备份。维护负责人需要先确认该容器/镜像是否仍是目标活动实例，核实Platform Artifact内容及其与PostgreSQL引用的配对关系，并在经批准的维护窗口内完成重建/挂载差异处理与隔离恢复验证。当前状态：`NOT_READY / NOT_AUTHORIZED / NOT_DEPLOYED`。

本清单不授权清理已运行的随机E2E Compose项目；另有多个`sq-v*`项目仍在运行，未操作其容器、卷、网络或镜像。详情见原始日志中的`stockquant-v12`筛选结果。
