# W1 Market Data 分钟 CSV 跨服务客户端增量

日期：2026-10-01。

V1.1 的“补齐跨服务OpenAPI/生成客户端”仍未全部完成。本次关闭其中一个明确边界：Platform API对Market Data分钟导入和分块上传生命周期的原始HTTP调用改为契约生成客户端，覆盖CSV import，以及CSV/Parquet upload create、chunk、progress、preview/finalize/cancel共5个下游操作。

扩展`market-data-minute-import.v1` OpenAPI，明示8个operation的的Platform service Bearer身份和owner范围；canonical create/chunk/progress请求/响应使用现有Schema，preview/finalize/cancel因返回结构依动作而异如实声明为对象，避免错误复用progress类型。生成TypeScript客户端纳入`contracts:generate`/`contracts:check`漂移门禁。Platform路由保留用户session校验、ownerId、UUID和format/action校验，并将Market Data状态码/响应体映射回Platform。未更改活动容器或发布配置。

验证：

- `pnpm contracts:check`：PASS，175 JSON、115 Schema、36 Fixture、OpenAPI caller/error coverage、生成客户端检查通过。
- `pnpm --filter @stockquant/platform-api-service lint`：PASS。
- `pnpm --filter @stockquant/platform-api-service test`：PASS，28 files / 106 tests；客户端测试核对import URL/身份/body/422保留，以及owner-scoped create、progress读取、finalize路由和header。
- `pnpm verify:stage -- --stage V1.1 --suite code`：PASS / exit 0；在为既有Qlib Worker单测开放ephemeral loopback权限后，V1.1当前完整代码套件通过。它运行本地代码/Fixture检查，不执行活动API切换或用户场景。

限制：本记录仅证明生成器与客户端单测。没有连接活动 Market Data/Platform 服务或执行跨容器 HTTP E2E；Platform其他跨服务边界仍待覆盖；全部minute operation的实际跨容器E2E也未执行。V1.1统一API发布/回退、通用Artifact交付、整体人工验收仍未完成，阶段状态保持PARTIALLY_IMPLEMENTED。
