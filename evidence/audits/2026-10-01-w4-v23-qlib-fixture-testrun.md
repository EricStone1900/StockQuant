# W4 V2.3 Qlib Fixture TestRun 工程切片

日期：2026-10-01（Asia/Shanghai）。范围：将既有 Quant Research Qlib Fixture Fit 接入 V2.3 owner-scoped Platform TestRun，并提供 Web 触发入口。仅使用确定性合成输入；不请求外部来源、不声称真实市场数据、PIT、模型独立验证或持久 Artifact 已完成。

## 已完成

- Platform 新增 `POST /api/v1/acceptance/v2/v2.3/research/qlib-fixture/runs`：先持久化 RUNNING TestRun，再用受服务身份保护的 `quant-qlib.v1` 生成客户端调用 Quant Research；完成后写回同一 TestRun 的断言和 Qlib 运行证据。读取由现有 owner-scoped `GET /api/v1/acceptance/v2/v2.3/runs/{testRunId}` 提供。
- 固定输入为120行确定性合成样本，train/valid/test 为72/24/24；为每行带入决策、特征可用及标签可用时间。断言要求实际 Qlib fit 完成、24项有限测试预测、时间因果检查PASS、有效模型/预测SHA-256、独立模型验证`NOT_RUN`、候选代码`NOT_PERFORMED`、盈利声明`NOT_MADE`。
- Web 验收页增加“运行合成 Fixture Qlib TestRun”入口，并在单独区域展示同一持久 TestRun；页面明确说明它不是市场数据、独立验证或已交付Artifact。
- 新增 `platform-v23-qlib-fixture.v1.json` OpenAPI契约和漂移检查；Quant Qlib客户端由`quant-qlib.v1`生成。

## 验证

- `pnpm contracts:check`：通过；JSON、生成类型、兼容矩阵与OpenAPI检查均无错误。
- Platform 类型检查及 lint：通过；Platform全部单测31文件/112项通过，包括持久TestRun成功/错误路径和owner读取隔离。
- Web 类型检查：通过；全仓 build 已包含新增验收页。
- `pnpm verify:stage -- --stage V2.3 --suite code`：最终退出码0；全仓 contracts/fixtures、build/lint/typecheck/unit、PostgreSQL/身份集成、Market Data Adapter、Ops与锁定Qlib容器 smoke通过。
- `pnpm --filter @stockquant/platform-api-service v23:qlib-fixture-testrun-smoke`：真实隔离Web/Platform/Quant Research/Qlib Worker/PostgreSQL调用链通过；Chromium点击按钮创建TestRun `e3c05763-aa11-4a6a-bf43-a63e525098a1`，Qlib 0.9.6/LightGBM 4.7.0完成Fit，24个有限预测；Web通过同一TestRun展示结果。owner读取200、foreign owner 403；CLI `--run e3c05763-aa11-4a6a-bf43-a63e525098a1 --check-only`退出0，正式脱敏证据导出退出0，Manifest SHA-256 `72c5e36ad9dbd4f593c22a003ab4198216f9d162a572878129765194ec996e54`。CLI核对与导出前后数据库TestRun记录相同。随机平台/Quant数据库、Qlib镜像/容器、Node服务和Web进程均由finally逐项清理；仅保留该TestRun导出的脱敏证据包。
- `pnpm --filter @stockquant/quant-research-service qlib:fit-smoke`：通过，真实锁定 Qlib 0.9.6 / LightGBM 4.7.0 在 Linux AMD64 容器中对120行合成Fixture拟合，24个有限预测，重复训练模型/预测Hash稳定，非法重叠切分HTTP 422拒绝。模型SHA-256 `08d29ca3ccefc37e887928d5a4512a9f63d53edef6cc91b4289e1731ec675695`；预测SHA-256 `09d1563ed1102a87f6e71672e9b1238ce844094aa336cb33efeea6ac995bdbe3`。临时镜像和Worker容器已清理；AMD64为Mac Apple Silicon仿真。
- 完整门禁需要本地回环权限；未提权的首次运行在Qlib Worker边界测试绑定回环端口时报沙箱权限错误。受控运行完整门禁后退出0；Worker HTTP边界13项、Qlib容器 smoke、Trade/Portfolio/Market Data隔离集成与相关单测通过。

## 未完成及边界

- 已在随机资源隔离栈完成Platform→Quant Research→Qlib Worker完整HTTP TestRun、Web按钮和同Run CLI只读核对；未执行证据导出。该次是工程回归，不是用户人工验收。
- 输入没有数据源许可或真实市场来源，研究用途授权为`UNCONFIRMED`；历史股票池、退市样本与PIT均未证明。
- 独立模型结果复算为`NOT_RUN`；业务Artifact持久存储`NOT_IMPLEMENTED`；候选执行`NOT_PERFORMED`；盈利声明`NOT_MADE`。
- W4/V2.3阶段、版本门禁、人工验收、Ubuntu实机验收均不因本工程切片关闭。NO_TRADE及无线源授权保持生效。
