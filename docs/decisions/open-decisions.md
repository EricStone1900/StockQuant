# 未决事项登记

状态：ACTIVE，更新日期：2026-09-08。未决不等于可以任意默认；到达最迟阶段仍未确认时，按“安全行为”阻塞对应能力并保留 `NOT_RUN`。

| ID | 决策 | 负责人 | 最迟阶段 | 未决时的安全行为 | 状态 |
|---|---|---|---|---|---|
| OD-001 | Node、pnpm、TypeScript、Web/服务框架精确版本 | 开发者 | V1.1 开始实现前 | Node 24.1.0、pnpm 10.34.5 已写入基线；框架/依赖和实际构建仍待锁定 | PARTIAL |
| OD-002 | V1.1 Python 版本及 uv 工具版本 | 开发者 | V1.1 Python 服务建立前 | Python 切片不启动 | OPEN |
| OD-003 | PostgreSQL、Artifact 实现、容器镜像、端口和卷名 | 开发者 | V1.1 Compose 建立前 | `stack:up` 保持未实现 | OPEN |
| OD-004 | 本地用户会话与服务身份的具体实现 | 项目所有者、开发者 | V1.1 API 实现前 | 所有写接口不可匿名开放 | OPEN |
| OD-005 | V1.1 CN/US 初始化 Fixture ID、预期账本和保留策略 | 开发者 | V1.1 场景冻结前 | 已建立[草案 Manifest](../../fixtures/v1/v1.1/manifest.json)；需实现后实测冻结 | PARTIAL |
| OD-006 | Qlib source commit、Python/数值栈和 ARM64 镜像 | 开发者 | V1.2 实现前 | 只保留 Adapter，不能声称 Qlib 通过 | OPEN |
| OD-007 | 策略持有期、再平衡、基准和组合数量（PRD Q05） | 项目所有者 | V1.2 策略验证前 | 使用计划中的低换手样例且不晋升 | OPEN |
| OD-008 | A股 V2 免费行情/新闻来源、许可、限流和留存 | 项目所有者、开发者 | V2.1 来源实现前 | 只使用明确 Fixture，真实来源 NOT_RUN | OPEN |
| OD-009 | RD-Agent source commit、模型 Provider、预算和外发限制 | 项目所有者、开发者 | V3.1 实验前 | 不调用真实模型、不声称 RD-Agent 闭环 | OPEN |
| OD-010 | 目标 Ubuntu CPU/资源/网络与部署位置 | 项目所有者 | V3.4 兼容计划冻结前 | Mac/模拟架构证据不能替代发布 | OPEN |
| OD-011 | 备份位置、保留期、RPO/RTO（PRD Q11） | 项目所有者 | V3.4 发布前 | 不通过迁移/发布验收 | OPEN |
| OD-012 | 首个市场优先顺序与阶段排期（PRD Q12） | 项目所有者 | V1.2 排期前 | V1.1 仍保持双市场基础契约 | OPEN |

完成决策时应链接 ADR、锁文件、配置或用户确认记录，并同步受影响的 PRD、架构、阶段任务和测试。
