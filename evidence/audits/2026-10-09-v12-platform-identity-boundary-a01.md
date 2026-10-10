# V1.2 Platform Acceptance API身份边界审计 A01

日期：2026-10-09
范围：V1.2 `AcceptanceController`下11条路由的用户身份边界。

审计发现`quant/probe`、`quant/factors`与`quant/rdagent-probe`缺少Platform会话身份校验，允许匿名调用方到达内部Quant服务转发路径。已为三条路由补齐与同控制器其他操作一致的session identity检查。E2E解析并枚举全部11条路由，匿名访问逐条预期401，伪造owner逐条预期403；正常会话继续执行正式Web/同Run CLI流程。

验证结果：

- Platform API build通过。
- `pnpm test:e2e -- --stage V1.2`通过；normal、rejection、取消与重启恢复覆盖4个TestRun；匿名401与伪造owner 403各11/11。
- 完整命令`pnpm verify:stage -- --stage V1.2 --suite code`在允许Docker访问的环境下退出0；四个Web/CLI TestRun均通过，隔离PostgreSQL及临时Compose卷/网络/容器清理完成。默认受限shell下因无法访问Docker daemon的重跑退出2，随后使用仓库要求的容器执行权限重跑并确认exit 0。
- 完整套件日志：[code-suite原始日志](./2026-10-09-v12-platform-identity-code-suite-a01.log)，SHA-256 `0c5f4d62fef5010a40dff040beb52045841fa87a39a8a81c604b64efabae6b83`。
- 定向E2E日志：[身份路由E2E日志](./2026-10-09-v12-platform-identity-e2e-a01.log)，SHA-256 `ddc41fcc41bbdce26bba534a365b7e2491db15bba1d5d7cfbf33c6af7eeb1636`。机器结构化报告及四个Run ID见[隔离E2E JSON](./2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-45c271350430c85b430b.json)及同名SHA清单。

一次重启恢复轮询期间出现Vite proxy `socket hang up`日志；Harness之后通过同一TestRun读回`COMPLETED`及Artifact，并在第二轮同Run恢复断言通过。临时项目资源清理报告为verified。此处不把短暂连接日志隐藏，也不把它视作最终业务失败。

本审计只关闭V1.2 Platform控制器身份缺口。它不证明全V1路由矩阵完整、活动库已升级、真实数据/模型路径、Ubuntu实机或当前范围人工验收，也不改变V1.2/V1的总体未完成状态。
