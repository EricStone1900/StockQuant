# V1.1 Portfolio Account OpenAPI 客户端增量

日期：2026-09-30。范围：将Platform API的V1.1 ScenarioRunner账户初始化、幂等重放、拒绝场景和快照/owner检查迁移到由`portfolio-account.v1.json`生成的客户端。

新增`node scripts/generate-portfolio-account-client.mjs`，支持生成及`--check`漂移检查，并接入根目录`contracts:generate`和`contracts:check`。生成客户端覆盖5个Portfolio Account操作，沿用契约声明的ServiceBearer安全方案，按OpenAPI生成参数/响应类型及路径编码；HTTP错误保留状态码和响应体。ScenarioRunner用同一客户端执行初始化、重复请求、冲突检查、快照和越权owner响应检查。加入客户端单测，覆盖service身份/owner头、路径编码、409状态和错误体。

验证结果：

- `pnpm contracts:check`：通过；173 JSON文件、114 schemas、契约兼容矩阵96条及17份OpenAPI契约检查通过。
- `pnpm --filter @stockquant/platform-api-service typecheck`：通过。
- `pnpm --filter @stockquant/platform-api-service test`：27个文件、96项测试通过。
- `pnpm --filter @stockquant/platform-api-service build`：通过。
- `pnpm verify:stage -- --stage V1.1 --suite code`：通过，退出码0；普通沙箱首次因Qlib Worker边界测试绑定loopback socket被拒绝，按该测试所需权限受控重跑后完整套件通过。重跑包括全仓build/lint/unit tests、合同与Fixture检查及V1.1对应隔离代码检查。
- `pnpm docs:check`：本次V1.1阶段运行所带基线检查通过，1199个本地Markdown链接无缺失。

此变更不触碰活动服务、真实数据源、共享数据库或Paper账本。它只关闭Portfolio Account消费者中的一个客户端缺口；V1.1“所有跨服务契约/客户端及发布流程”、服务迁移/分层依赖命令、活动API切换/回退仍未完成。V1.1代码suite PASS不改变该阶段整体PARTIALLY_IMPLEMENTED、版本门禁INCOMPLETE或用户验收状态。
