# W8 Ubuntu 目标主机预检（2026-10-05）

执行 `pnpm verify:w8:ubuntu-host` 的只读预检，结果为 `BLOCKED`，退出码 2。当前工作主机是 macOS 25.5 ARM64（10 个逻辑 CPU、32 GiB 内存）；项目目录可用空间约 154.9 GB。Docker 本地运行时不可用，因此无法取得 Linux/Ubuntu x86_64 容器运行时信息。

门禁判定 `targetIsUbuntuX86_64=FAIL`、`linuxContainerRuntimeMatchesTarget=FAIL`、资源阈值 `NOT_DEFINED`、目标主机授权 `NOT_CONFIRMED`。本次没有部署/迁移、访问外网、读取凭据或触碰活动服务。机器结果见同名 JSON；预检单测 4/4 通过。

此记录确认目前仍没有可执行 Ubuntu 实机验收的目标环境，不关闭 W8。解除阻塞需要提供/连接经确认的 Ubuntu x86_64 主机与容器运行时，并冻结资源阈值、网络/存储与维护授权后重新预检。
