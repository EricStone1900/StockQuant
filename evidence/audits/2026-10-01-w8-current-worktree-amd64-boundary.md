# W8 当前工作树 AMD64 镜像与隔离边界复验

日期：2026-10-01  
环境：Mac M1 / Docker Desktop `linux/amd64` 仿真  
状态：当前源码应用镜像10/10隔离边界通过；不构成Ubuntu实机或活动服务迁移验收。

## 构建

使用唯一Compose项目`stockquant-w8-20261001-current`构建，不启动Compose服务：

```sh
COMPOSE_PROJECT_NAME=stockquant-w8-20261001-current DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose -f infra/compose/docker-compose.yml build
COMPOSE_PROJECT_NAME=stockquant-w8-20261001-current DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose --profile web -f infra/compose/docker-compose.yml build web
```

构建完成10个应用镜像（9个默认服务应用及profile Web），全部以当前工作树Dockerfile构建；Research Automation镜像构建时执行build与169项单测，Web镜像完成TypeScript与Vite production build。

| 应用 | 镜像Digest | 运行用户 |
|---|---|---|
| Platform API | `sha256:4d00b835b9907b077dd8e8786e31860b9ff173543958e9c510cd51d141fa1a3d` | node / UID 1000 |
| Market Data | `sha256:b3e05b06b512ebdf986559db19cefd7d347b953a55bbe857126bb3cb01f9552b` | node / UID 1000 |
| Portfolio Risk | `sha256:52831c87b71a9edfcb07d69da9aee0a8f5f71039aaa0dc8bb03c7afd6b5f8de4` | node / UID 1000 |
| Trade Execution | `sha256:efe1855c64186f3aa96a29290f94f20114122ad027989dcd631a236c3d54a008` | node / UID 1000 |
| Decision Governance | `sha256:1f90f494ccbdbe47f1b840e869f4e400166adf91ad1855befe06854674b8ac3` | node / UID 1000 |
| Historical Replay | `sha256:b5956c8d0c8d4d0c984f46449f84145a5e87363d9aa70935b4cf7011f02e8b6d` | node / UID 1000 |
| Quant Research | `sha256:e437c0963d15d510d5054c46075fad7d417c82e88698b0ee6949cbc7901967a7` | node / UID 1000 |
| Research Automation | `sha256:e9995fbe2be964206acf8ba91dc53d49c1a03100cef983b37c79392197986ba0` | node / UID 1000 |
| Web | `sha256:5268992ff441199c9534a4e2cf38822f1923add5cf1f00459d5d00669eef5a90` | node / UID 1000 |
| Qlib Worker | `sha256:5b3161127767bfe033f386ba32ff4dd881a56dce08fa6eb2e0f4d57bd8f41768` | UID/GID 10001 |

## 验证

`STOCKQUANT_W8_IMAGE_PREFIX=stockquant-w8-20261001-current- node scripts/w8-container-boundary-smoke.mjs`退出0：10/10容器以`network=none`运行；各应用均使用非root身份及只读根文件系统。Market Data唯一持久卷写入成功；Web与Research Automation确认没有Docker Socket及非空TOKEN/SECRET/PASSWORD/API_KEY/PRIVATE_KEY/CREDENTIAL环境值；Qlib Worker加载Qlib 0.9.6和LightGBM 4.7.0并通过只读检查。脚本产生的唯一临时卷在`finally`中移除。

`pnpm verify:w8:postgres-auth`退出0：锁定PostgreSQL 16.9镜像在network none、无宿主端口和持久卷的临时容器中使用SCRAM；9个服务角色正确口令均通过，空口令/错口令各9次均拒绝。临时容器和0600临时凭据文件清理完成。`pnpm verify:w8:service-bearers`退出0：8个本地独立Bearer身份配置有效、无重复；文件mode 0600、secrets未输出且活动服务未应用。`pnpm test:w8:service-bearers` 3/3通过。

所有测试均在隔离、一次性对象中运行。未启动Compose、不触碰活动容器/数据库/卷、不轮换活动身份、未连接Ubuntu或真实市场/模型/交易服务。此AMD64仿真仍不能替代目标Ubuntu x86_64实机、实际48库备份/迁移、活动Bearer切换监控、5交易日观察或用户验收。`NO_TRADE`和无数据源授权保持不变。

机器可读镜像摘要及本记录的SHA-256见`2026-10-01-w8-current-worktree-amd64-boundary.json`和`2026-10-01-w8-current-worktree-amd64-boundary.sha256`。
