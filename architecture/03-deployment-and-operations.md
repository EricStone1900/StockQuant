# Mac M1开发、Ubuntu部署与运维设计

状态：设计/NOT_RUN。依据[三版计划](../docs/prd/05-three-version-delivery.md)。

## 1. 运行单元

| 单元 | 运行方式 | 持久化/隔离 |
|---|---|---|
| Web/平台API | 开发可原生Web热更新，验收补容器Web | 会话/TestRun平台库，用户入口鉴权 |
| 核心API/事件Worker | Linux镜像按阶段启用 | 各域独立DB/User/迁移 |
| PostgreSQL/NATS/Temporal/Artifact | Compose基础设施 | 持久卷与备份，Temporal独立存储 |
| Qlib/Replay计算 | 独立CPU Worker默认并发1 | 数据只读，输出按run隔离 |
| FakeBroker | 独立测试组件/进程，可容器化 | 独立模拟资产/订单/故障序列 |
| RD-Agent控制器/Runner | 控制器可信，生成代码不可信 | 分离权限/工作区，Runner无Socket/秘密 |

core/data/research为按能力启用的配置分组；stack:up --stage解析阶段依赖。精确端口/镜像版本/卷名在S0和脚手架实测冻结，不把未验证Compose写成可用命令。缺能力显示阻塞。

## 2. 双架构开发和发布

Mac优先linux/arm64，固定Qlib/RD-Agent commit和各自依赖锁，在Linux编译扩展。源码可bind mount，虚拟环境和编译产物留容器；大数据用命名卷或对象存储并测I/O。

Ubuntu为x86时构建linux/amd64，为ARM则对应构建。ARM依赖失败时记录原因，选择AMD64小样本模拟或实际Ubuntu远程开发；不默认所有上游场景都原生支持。证据包含hostArchitecture/containerPlatform/emulated、镜像Digest。

V1/V2目标架构烟测，V3必须实际Ubuntu安装/恢复/Qlib/真实RD-Agent/Web E2E及持续Paper。镜像迁移不搬运命名卷，数据/模型/配置与秘密引用分别恢复和验证。

## 3. 网络与研究隔离

本地入口loopback，远程TLS/会话鉴权。内部DB/总线/Temporal/API不直接公网暴露；内部调用仍校验服务身份和run/account范围。秘密不写Git/镜像/Web响应/报告。

Web后端和生成代码无Docker Socket、Broker、Registry批准或其他run文件访问。可信控制器本地如用宿主Socket，明确其高权限，不能认为只读挂载限制Docker API。Ubuntu研究执行环境独立，使用白名单镜像/挂载/网络和有限输出的受控Runner协议。

限制实验CPU/内存/进程/时间/输出/外网，依赖在受控构建期安装。研究与订单/对账资源分配独立；模型预算单列，未知响应可能计费，不无限重试。

## 4. 健康与观测

/live与/ready或等价探针分别表示进程/依赖能力，/version标代码/契约。贯通correlationId/testRunId及账户/市场/订单/Fill；只记录脱敏信息。

监控DB锁等待、Outbox/Inbox滞后、Temporal队列、数据年龄/覆盖、UNKNOWN/对账差异、任务耗时/内存/磁盘与模型预算。P95/资源/恢复目标在目标硬件上先记录预算后测，不预填达到。

## 5. 备份、暂停与恢复

备份各域DB、FakeBroker独立状态、Artifact清单/文件、配置/规则/策略和发送日志；记录跨库一致性边界。隔离恢复后先暂停，验证Hash/账户/订单/任务，查模拟券商权威事实，对账收敛后按批准规则恢复。

保留在途/UNKNOWN，不删账本/卷、不清预算解决差异。升级回滚兼容已写数据，不默认回滚业务事实。外部故障由限定脚本/人工执行，Web提供说明和证据收集，不执行任意shell。

关闭页面不影响任务；Mac睡眠是实际停机断档，记录错过窗口并重评，不补旧单。

## 6. 交付证据

每阶段交付锁/镜像/迁移、实际URL/命令、资源限制和恢复Runbook。命令按三版规则第8/10节，缺依赖/未满观察不PASS。V2 A股20实际交易日、V3 Ubuntu至少5实际交易日各自记录；LIVE仍不可用。
