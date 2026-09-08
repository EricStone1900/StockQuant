# ADR-0004：本地安全与测试隔离

- 状态：Accepted
- 日期：2026-09-08
- 适用范围：V1～V3 本地、回测与 Paper 环境

## 背景

即使系统只供个人使用，Web、后台任务、生成代码和验收场景仍具有不同权限。测试需要制造失败，但不能通过直写领域数据库、暴露 Docker Socket 或清空共享状态来实现。

## 决策

1. 本轮允许的 brokerMode 只有 `FAKE`；`LIVE` 和真实券商配置在服务端失败关闭，不能只依靠隐藏 Web 按钮。
2. 浏览器只调用平台/领域 API。Web 与生成代码 Runner 无 Docker Socket、数据库管理员凭据、控制器秘密或跨 run Artifact 权限。
3. 每个 TestRun 使用独立 namespace、账户、缓存、事件和 Artifact 前缀；重新运行默认创建新范围。
4. 本地入口只绑定 loopback。用户会话、服务身份和 run/account scope 均由后端验证；内部 API 不因位于 Compose 网络而跳过认证。
5. 故障通过 FakeBroker、数据 Adapter 或限定基础设施脚本注入，保存计划和实际事件序列。Web 不提供任意 SQL、shell 或宿主容器管理入口。
6. 清理只接受明确且已结束的测试范围，默认保留账本和证据；活动运行、UNKNOWN 订单及范围外资源拒绝清理。

## 影响

本地开发需要最小身份/服务凭据机制和更多隔离元数据，但可以让 Web 人工验收、CLI 复验和未来 Ubuntu 部署使用相同信任边界。

## 验证

V1.1 覆盖 401/403、跨 run 查询、同键异载荷、重启持久化和 LIVE/真实券商拒绝；后续阶段增加订单、Runner 和恢复攻击面。详细控制见[安全与配置架构](../../architecture/05-security-and-configuration.md)。
