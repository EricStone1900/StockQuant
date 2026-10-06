# W8 当前执行主机只读预检

日期：2026-10-03（Asia/Shanghai）

执行 `node scripts/w8-ubuntu-host-preflight.mjs`，结果为 `BLOCKED`。当前执行环境报告 Darwin/aarch64、10个逻辑CPU、约32 GiB内存、约145 GiB可用磁盘，容器运行时 `UNAVAILABLE`。

门禁结果：目标Ubuntu x86_64检查FAIL；与目标匹配的Linux容器运行时FAIL；资源阈值未定义、目标主机授权未确认。命令明确记录未进行部署/迁移、未使用外部网络、未读取凭据。当前环境不能作为Ubuntu V3.4目标机，也没有据此推断任何部署或观察已完成。

下一步须由后续主机证据解决：提供实际Ubuntu x86_64主机及Docker、经确认的资源阈值/维护范围/备份目标，再运行相同预检。该报告不要求或授权修改活动服务，也不替代迁移前复核。
