# ADR-0002：Schema-first 跨服务契约

- 状态：Accepted
- 日期：2026-09-08
- 适用范围：所有跨服务 HTTP、事件、Fixture 与证据

## 背景

Web、TypeScript 服务和 Python 服务不能依赖共享 ORM 或手写的多份数据结构。金额、证券身份、业务时间、幂等和 TestRun 又属于必须一致的正确性边界。

## 决策

1. `packages/contracts/schemas/` 保存规范 Schema；设计文档不是运行时契约源。
2. 值对象和跨服务消息使用 JSON Schema 2020-12；HTTP 描述使用兼容 JSON Schema 的 OpenAPI；事件描述在启用 NATS 的阶段加入 AsyncAPI。
3. TS/Python 类型和 Client 必须从同一规范源生成，生成物不得手工修改。生成命令与工具版本进入锁文件。
4. 写命令统一携带幂等键、关联 ID、版本和原因/来源；actor 来自可信身份上下文。错误、事件 Envelope、ArtifactRef 和 run-scoped Clock 使用公共定义。
5. 破坏性变更创建新 Schema/接口版本，并在生产者切换前验证消费者；兼容报告属于阶段证据。

## 影响

新增接口需要先更新 Schema 和契约测试，初期速度略慢，但可避免 Web、CLI、TS 与 Python 对金额、枚举和时间产生隐性分歧。

## 验证

V1.1 必须生成至少 TS/Python 类型并验证往返样本、无效样本、兼容性和 Fixture。当前只建立最小 Schema 源，类型生成和运行验证仍为 `NOT_RUN`。
