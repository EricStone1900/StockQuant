# W3 Market Data 外部来源运行时用途门禁

日期：2026-10-01（Asia/Shanghai）

## 决定和范围

当前项目所有者确认`NO_TRADE`且暂无线源授权。此切片只实现默认关闭的运行时门禁，并验证未授权请求不会到达外部Provider；没有请求外部来源，没有启用采集、Paper、交易或模型调用，没有修改活动服务。配置变量不构成许可或项目所有者批准。

## 实现

Market Data将quote、news、minute collection分开授权。每一用途要求精确`true`开关、授权/决定引用、数据版本与精确source ID allowlist。quote preview、live news和source smoke在Provider fetch之前检查；缺授权时返回403。采集executor创建、`/ready`状态、来源目录状态以及DC08A激活/晋级/监督器均遵守同一采集授权条件。服务Bearer只校验调用者，不能取代来源用途授权。

## 验证

- `pnpm --filter @stockquant/market-data-service typecheck`：PASS。
- `pnpm --filter @stockquant/market-data-service test`：PASS，16 files / 66 tests。
- `node --test scripts/dc08a-activate.test.mjs scripts/dc08a-promote-20.test.mjs scripts/dc08a-supervise.test.mjs`：PASS，26/26。
- `pnpm --filter @stockquant/market-data-service service-auth:http-smoke`：PASS；未授权quote/news/source smoke均403，`unauthorizedSourceRequests=0`。
- `pnpm verify:stage -- --stage V2.4 --suite code`：PASS，退出0；覆盖契约、lint/typecheck/build/unit、隔离后端集成、V2.4 API/Web normal/rejection/recovery、同Run CLI只读核对、恢复响应丢失验证和Linux ARM64 readiness容器检查。V2.4烟测报告注明`activeServicesTouched=false`。
- `docker compose --env-file .env.local -f infra/compose/docker-compose.yml config --quiet`：PASS。

## 未解决项

OD-008仍OPEN：逐来源用途许可、限流、数据覆盖与留存责任尚未确认。O1/O2不得因本切片而启动或增加观察日；已有8/20观察计数保留为历史，不自动续计。三版版本门禁、阶段人工验收和真实Ubuntu验证仍以各自权威验收记录为准。

## Python 网络适配器的第二道门

后续静态路径盘点发现Python CLI可被独立调用，不经过Market Data TypeScript执行器。已在构造Sina/BaoStock/Eastmoney/TDX客户端之前再次验证集合用途开关、授权引用、数据版本和完整source allowlist，并新增两项Python测试覆盖默认拒绝和精确来源绑定。`UV_CACHE_DIR=/tmp/stockquant-uv-cache uv run --offline pytest tests/test_providers.py`在`services/market-data-adapter`退出0，33/33通过。无授权时在执行网络代码前返回不可重试`SOURCE_NOT_AUTHORIZED`。

经此增量重跑`pnpm verify:stage -- --stage V2.4 --suite code`（受控loopback访问）退出0；Market Data PG集成23/23、V2.4真实隔离API/Web正常/拒绝/恢复路径与ARM64 readiness smoke通过，`activeServicesTouched=false`。首次沙箱内运行因Qlib Worker隔离测试需要绑定loopback而被OS拒绝，保留失败记录；受控权限下重跑完成。

## 独立探针入口的封闭

进一步盘点仓库中的实时分钟来源脚本，发现`probe-minute-source-capability.py`（Sina/BaoStock）、`probe-baostock-stability.py`（BaoStock）和`diagnose-tdx-lunch-boundary.py`（TDX）也能绕过服务调用边界。三者现共享相同的分钟来源授权函数，在开会话、发HTTP/TCP或写边界诊断证据前检查用途开关、决定引用、数据版本和精确source allowlist；未授权统一返回`BLOCKED`/退出2。`probe-tdx-minute-capability.py`在启动适配器子进程前做同一检查。

自动测试以空授权环境启动四个命令并确认`blockedBeforeNetwork=true`、退出2；TDX诊断还确认不创建输出文件。`UV_CACHE_DIR=/tmp/stockquant-uv-cache uv run --offline pytest`：67/67通过。受控重跑完整`pnpm verify:stage -- --stage V2.4 --suite code`退出0；契约/Fixture、完整代码质量和单测、隔离Market Data PG 23/23、DC06 HTTP/PG、V2.4 Paper API/Web三场景、同Run CLI和Linux ARM64 readiness通过。活动服务未连接或改动，没有外部来源请求。`pnpm baseline:check`、三版证据引用验证（V1 34/3/4、V2 138/19/20、V3 122/22/23，缺失/Hash失败为0）也通过。普通沙箱第一次运行因隔离Qlib测试的loopback bind被OS拒绝；受控loopback重跑成功。

## BaoStock历史导入与PIT入口

全仓搜索`bs.login()`后发现BaoStock日线导入、分钟导入、多频率能力探针和财务/行业PIT探针均可直开SDK会话。增加与采集授权分离的`HISTORICAL_RESEARCH`用途配置（授权开关、引用、数据版本、source ID白名单），Compose与`.env.example`默认false/空。分钟历史导入同时要求`MINUTE_COLLECTION`和`HISTORICAL_RESEARCH`分别获批，日线与PIT检查只要求历史研究用途；所有入口在Provider导入/session打开和输出目录写入前拒绝，并以`BLOCKED`/exit 2表达等待授权。`probe-baostock`同时覆盖日/分钟和Universe，故要求两个用途授权。

四类新增脚本行为纳入自动测试（两个导入器没有创建任何输出目录）；Python适配器全套69/69、Market Data服务67/67通过。受控`pnpm verify:stage -- --stage V2.4 --suite code`再次退出0，隔离Market Data PostgreSQL 23/23、DC06 HTTP/PG、Paper normal/rejection/recovery API/Web、同Run CLI和ARM64 readiness均PASS。三版证据引用及baseline随后再核。所有请求均停在本机授权检查，没有访问BaoStock、Sina、Eastmoney、TDX或新闻源。
