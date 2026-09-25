# P3.4 身份与账户详情垂直切片

日期：2026-09-24（Asia/Shanghai）。

## 改动

- 平台容器统一暴露 `portfolioApiUrl`，账户查询通过 `platform-api-service` 服务身份和已认证 owner 转发到 Portfolio 服务。
- 新增 `GET /api/v1/accounts/:accountId`，返回账户快照、运行模式、owner 和 `v1-account-detail-1` 证据版本。
- Portfolio 返回403时平台明确返回 owner 越权错误；不存在账户返回404；依赖异常返回503。
- V1.1 Web 页面在 TestRun 产生账户后自动读取账户详情，展示市场、现金/币种、持仓数量、账本条目、账本版本和原始证据。

## 验证

- 平台账户详情单测覆盖 owner header 转发和 Portfolio 403 越权：通过。
- `pnpm --filter @stockquant/platform-api-service test`：10个测试文件、34/34通过。
- `pnpm --filter @stockquant/platform-api-service typecheck`：退出0。
- `pnpm build`、`pnpm typecheck`：全仓退出0，Web bundle构建通过。
- `pnpm docs:check`：469/469；`pnpm contracts:check`：退出0；`git diff --check`：退出0。

## 运行环境与 Web 验证

- 重建 `platform-api-service` 和 `web` 镜像成功；平台服务重建后 `/ready` 返回200。Compose 因依赖关系同时重新创建了 `research-automation-service`，其健康检查通过；Portfolio、交易执行器、行情服务和数据库卷未重建。
- 重建后的真实 API 运行：V1.3 `testRunId=46fb24b2-5758-4514-bf68-c54405ec92ce` 返回 `COMPLETED`、2条 PASS 断言；V1.1 `testRunId=7b75d5bf-58b1-4a3c-93a9-b2369f199fea` 的账户详情返回 `v1-account-detail-1`、CN_A、10000.0000 CNY、1条账本记录。
- 仅重启平台 API/Web 后重新读取同一 V1.3 TestRun，仍为 `COMPLETED`、2条断言；同一账户详情仍可按 owner 读取。
- Web 重新构建后运行 V1.1 normal，刷新页面前后 `testRunId` 均为 `01077c93-1ba6-4680-8cc0-7028f865a6d8`，页面继续显示 `COMPLETED`、同一账户、`10000.0000 CNY`。
- 重启前后 Paper 观察均为 `8/20 WAITING`，调度器 `RUNNING`，正式活动订阅仍为 `dc08a-20260917-20-v1|true|281`；`pnpm v24:preflight` 重启后退出0。

## 未完成与边界

运行环境重建和 Web 刷新验证已完成，但双市场账户仍需在隔离 TestRun 中分别初始化，用户人工确认仍未签署。统一身份服务、V2.1/V2.2历史运行迁移和账户历史列表属于后续工作。
