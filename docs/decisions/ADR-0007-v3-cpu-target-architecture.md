# ADR-0007：V3 本机开发与 Ubuntu CPU 目标架构

- 状态：Accepted
- 日期：2026-09-21
- 适用范围：V3.1 RD-Agent 研究、V3.4 Ubuntu 迁移
- 决策依据：项目所有者在 2026-09-21 确认本架构方案

## 背景

开发主机为 Apple Silicon Mac，后续目标 Ubuntu 主机没有 GPU。RD-Agent 官方运行边界是 Linux；当前冻结的 RD-Agent/Qlib 组合仍包含 CUDA 基础镜像和未验证的 ARM64 兼容性，因此不能把 Mac ARM64 或 GPU 作为最终运行假设。

## 决策

1. Mac M1 用于日常开发、契约/服务/Web 验证和小样本 CPU 研究；容器优先使用 `linux/arm64`。
2. 本机需要验证 amd64 兼容性时使用 `linux/amd64` 容器模拟，但模拟结果只作为功能烟测，不作为性能或容量证据。
3. Ubuntu 正式目标暂定为 `x86_64`，使用 `linux/amd64` CPU-only Controller、RD-Agent Runner 和 Qlib Runner；不要求 GPU。
4. RD-Agent/Qlib 使用独立 CPU 镜像，固定 source commit、Qlib commit、Python/依赖锁和镜像 digest；不直接复用未完成兼容核对的通用 Qlib Worker。
5. Controller、Runner 和生成代码分权。生成代码无 Docker Socket、数据库、模型密钥或未授权网络；Runner 任务使用单并发、独立 namespace、资源上限和失败 Artifact 保留。
6. DeepSeek/SiliconFlow 只通过显式外发 allowlist 访问，FakeBroker 保持唯一交易通道，真实券商和 LIVE 写入继续禁用。

## 影响与限制

- Ubuntu x86_64 是正式兼容性和性能测量目标；Ubuntu ARM64 需要另行验证，不能由本 ADR 推定兼容。
- CPU-only 运行预计比 GPU 慢，V3.1 先保持单并发和小样本；资源、超时和输出上限在真实 Runner 烟测后冻结。
- 镜像、依赖、Runner 隔离、预算账本和真实模型调用仍需阶段证据；本 ADR 不表示 V3.1 或 V3.4 已通过。

## 验证门禁

- Mac：完成 `linux/arm64` 基础服务和小样本功能验证，并记录是否使用 amd64 模拟。
- Ubuntu：实际构建/启动 `linux/amd64` CPU 镜像，记录 host/container architecture、镜像 digest、资源用量、迁移恢复和 Web E2E。
- V3.1：完成一次真实模型→生成代码→Qlib CPU 评价，并保留费用、失败和 Artifact 证据。
- V3.4：完成 Ubuntu 部署、恢复、全阶段回归及至少 5 个实际 A 股交易日观察；未完成时保持 `NOT_RUN`。
