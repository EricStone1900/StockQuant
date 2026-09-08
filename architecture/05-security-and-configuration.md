# 安全边界与配置架构

日期：2026-09-08。状态：设计/NOT_RUN。范围为本轮 V1～V3 模拟系统；长期真实券商和 LIVE 需要独立威胁评估与上线授权。

## 1. 信任边界

| 区域 | 信任级别 | 可访问 | 明确禁止 |
|---|---|---|---|
| 浏览器 | 不可信客户端 | 平台 API、本人获授权的模拟范围 | DB、消息总线、Docker Socket、服务秘密 |
| 平台/领域 API | 可信业务进程 | 自有 DB/User、版本化内部 API | 跨库写、共享管理员账号、绕过领域命令 |
| 后台 Worker | 限定服务身份 | 指定队列、服务 API、run 前缀 | 用户签署、扩大 Mandate、任意其他 run |
| RD-Agent 控制器 | 高权限受控组件 | 模型网关、Runner 调度、研究 Artifact | 交易授权、直接下单、策略自动激活 |
| 生成代码 Runner | 不可信执行区 | 只读固定输入、专属输出、必要的受限网络 | Docker Socket、密钥、业务 DB、其他 run、交易 API |
| FakeBroker | 独立模拟边界 | 自有订单/成交/资产库、限定故障端口 | 真实券商 SDK/凭据、直接写平台账本 |

## 2. 身份与授权

本地仍需要真实用户会话和服务身份，不以“只有本人使用”代替授权。浏览器只获得短期、HttpOnly、SameSite 会话；具体实现由 OD-004 冻结。用户操作绑定 ownerId，服务调用绑定 serviceId 和允许的 route/scope。

所有读写同时检查 environmentMode、accountId、market、testRunId/namespace。内部网络不是可信身份。人工验收记录必须来自真实用户会话，脚本不能代签。写命令的 actor 从认证上下文生成，不能接受请求体自报身份。

## 3. 交易失败关闭

- 配置 Schema 只允许本轮启用 `BACKTEST/PAPER` 和 `brokerMode=FAKE`；`LIVE` 或非 Fake Broker 在进程启动及每个写边界同时拒绝。
- 仓库、默认镜像和测试配置不包含真实券商 SDK、账号字段或通道插件。
- 健康、身份、账户、价格、规则、授权任一不可核验时拒绝新动作，但继续处理合法已确认模拟 Fill 和权威查询。
- UNKNOWN 只查询原模拟订单，不盲目重发或仅凭超时释放资源。

## 4. 配置与秘密

配置优先级为：版本化非秘密默认值 → 环境专用非秘密配置 → 运行时环境变量/秘密引用。环境变量名称在 `.env.example` 公开，真实秘密不得写入 Git、镜像层、日志、证据或 Web 响应。

| 配置组 | V1.1 基线 | 所有者/记录 |
|---|---|---|
| 运行模式 | PAPER + FAKE；LIVE=false | 平台启动校验和证据 Manifest |
| 网络 | 本地入口 loopback；内部端口不公开 | Compose 与版本页 |
| 数据库 | 每域独立 DB/User；管理员只用于受控初始化 | 秘密引用和迁移记录 |
| Artifact | 每服务/每 run 前缀；Hash 后发布 | ArtifactRef 与访问策略 |
| 计算 | Worker 并发 1；CPU/内存/时限待实测冻结 | 环境证据 |
| Provider | V1 无真实行情/模型/券商凭据 | 能力接口显示 UNSET/disabled |

端口、镜像、数据库名和限制完成实测前保持[未决](../docs/decisions/open-decisions.md)，不能从本表推断已经部署。

## 5. TestRun 与清理

TestRun 创建时分配不可复用的 namespace，并限制账户、数据库记录、缓存、事件 subject/consumer 和 Artifact 前缀。Web 与 CLI 通过同一业务 API 初始化；check-only 只有读权限，不能触发数据准备、模型或订单。

故障端口仅在 test profile 可用，并同时要求测试服务身份、目标 run、固定场景版本和幂等键。实际故障顺序写入证据。清理命令必须列出确切、非活动目标；活动运行、UNKNOWN 状态、共享卷和历史证据拒绝删除。

## 6. 网络和容器

数据库、NATS、Temporal、对象存储管理端口不直接暴露公网。开发期确需暴露到宿主的端口只绑定 `127.0.0.1` 并记录原因。生产入口使用 TLS；V1.1 本地明文只能位于 loopback。

Web 后端和 Runner 不挂载 Docker Socket。可信控制器若未来需要宿主容器权限，应部署为独立管理边界；只读 Socket 挂载不构成限制。镜像使用非 root 用户、只读根文件系统和最小 capabilities 的可行性在各服务阶段验证。

## 7. 日志、证据与留存

日志记录 correlationId/testRunId、服务、版本和非敏感业务 ID；账户外部标识、token、cookie、连接串和 Provider 内容按字段脱敏。证据导出使用允许清单并生成 Manifest Hash，用户签署与旧失败追加保存。

留存、备份位置和 RPO/RTO 在 OD-011 冻结。未冻结前不自动删除账本、授权、订单、成交或人工验收证据。

## 8. V1.1 安全验收输入

- 匿名写入返回 401；合法用户跨 owner/run/account 查询返回 403。
- 同幂等键异载荷返回 409且不产生第二笔期初流水。
- `LIVE`、非 `FAKE` broker、真实券商字段和管理端口公开配置均使启动或命令失败。
- 重启后会话失效策略、账户事实和 TestRun 证据符合已冻结配置。
- Web、平台 API 和 Runner 容器检查无 Docker Socket 与多余秘密。

这些是待实现测试输入，当前全部 `NOT_RUN`。
