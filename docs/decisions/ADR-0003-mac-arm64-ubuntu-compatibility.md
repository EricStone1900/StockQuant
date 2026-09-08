# ADR-0003：Mac ARM64 与 Ubuntu 兼容策略

- 状态：Accepted
- 日期：2026-09-08
- 适用范围：本地开发、镜像构建和 Ubuntu 交付

## 背景

开发主机是 Apple Silicon，而最终 Ubuntu 的 CPU 架构尚未冻结。Qlib、RD-Agent 及数值库可能包含原生扩展，macOS 环境不能作为 Linux 兼容证据。

## 决策

1. Mac 日常后端开发首选 `linux/arm64` 容器，默认研究/计算 Worker 并发为 1。
2. 原生扩展在目标 Linux 镜像内构建。源码可以挂载，虚拟环境、wheel 缓存和 `.so` 不从 macOS 复制。
3. Qlib、RD-Agent 使用独立镜像与锁；每个镜像记录 source commit、基础镜像、依赖锁和最终 Digest。
4. 目标 Ubuntu 为 amd64 时，在 V1/V2 进行小样本 `linux/amd64` 兼容烟测并明确 emulated；V3 必须在实际 Ubuntu 主机完成部署、恢复和 E2E。
5. 每份环境证据记录 hostArchitecture、containerPlatform、emulated、CPU/内存/磁盘限制与实际用量。

## 影响

双架构构建会增加时间，模拟 amd64 的性能不能用作容量结论。该成本换取开发期尽早暴露原生依赖差异，并确保最终验收不把 Mac 容器等同于实际 Ubuntu。

## 验证

V1.1 建立兼容矩阵和 core 容器烟测；V1.2 验证真实 Qlib；V3.1 验证真实 RD-Agent；V3.4 完成真实 Ubuntu 证据。
