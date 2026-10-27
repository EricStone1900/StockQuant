# V2.2 / C3 清单与证据复核

日期：2026-10-23。目的：按 C3 原始第 2、7 节逐项核对实现和可引用证据，区分已交付的软件能力、自动验证证据与未完成项。首段仅做文档/代码只读复核；后续执行按复核发现实现了查询页和覆盖API并运行对应验证，没有发出外部数据请求。

## 结论

C3 自动化上传主链和多项存储能力已有证据。2026-10-23已补齐正式 V2.2 查询、覆盖、版本比较及分钟聚合/日线参考值对账能力，MinuteBar逐Bar适用状态/涨跌停价引用在无来源时安全落为UNKNOWN。最新候选统一TestRun的五项自动断言、同Run CLI核对、恢复复验和完整code suite均通过；覆盖报告自身为INCOMPLETE（160/240有效、80 UNKNOWN），所以不代表样本覆盖完整。项目所有者随后确认当前候选人工验收通过，签署绑定TestRun `75300ba9-0807-48f5-80dc-a6cadce18b2c`与Manifest SHA-256 `b95d07c9b2123279990bbf70bc8541f29ff78e12f47cf2f28a96a5e75d10c827`，只覆盖本地合成/Fixture软件闭环，详见[人工验收记录](./2026-10-23-v22-c3-current-candidate-human-acceptance.json)。权威状态/限价事实和外部来源许可仍未验证，阶段保持PARTIALLY_IMPLEMENTED。

## 第 2 节需求对照

| 原始任务 | 现有证据 | 复核状态 | 尚缺内容 |
|---|---|---|---|
| MinuteBar 核心字段、单位、来源/版本、时间语义 | `MinuteImportBar` 有证券、市场、频率、起止时间、availableAt、RAW OHLCV/金额及 adjustment；上传元数据/manifest保留来源、单位、时区和 BAR_START/BAR_END。 | 部分完成 | 规范MinuteBar和生成Schema/Client已包含逐Bar适用状态及限价引用；CSV/Parquet无相应事实时为UNKNOWN/null，旧JSONB分页自动标准化。权威状态/价格事实尚无输入；来源文件、DataVersion和许可仍由Manifest/页级版本记录。 |
| CSV/Parquet 映射、预览、错误行、分区、续传、幂等及修订版本 | `2026-10-21-v22-c3-closeout.md`、`2026-10-21-v22-c3-gap-recovery.md`；CSV/Parquet上传链、分块重启续传、版本身份与持久发布已通过隔离服务/PG/Web 证据。 | 已完成（工程交付） | 该状态只表示实现和自动证据；不代表用户验收或数据研究用途获准。 |
| 重复/价格/单位/时段/缺Bar、停牌与日线聚合差异 | `minute-quality.ts` 校验重复、OHLC、单位、非交易时段；缺口分类报告区分 PRESENT/UNKNOWN/MISSING/SUSPENDED；分钟/日线比较器和真实Web服务链均通过。 | 部分完成 | 参考日线由操作者提供、来源未独立核验；聚合不证明分钟覆盖完整。状态/停牌和涨跌停事实缺少可信逐Bar输入，因而仍UNKNOWN。 |
| 按证券/日期分区读取、流式处理、小样本与坏数据包 | 每日 RANGE 分区、范围分页、100k Parquet重启续传与100k/1.44M仓储容量证据；固定有效/拒绝Fixture和导入套件见 `2026-09-26-p6-daily-partition-storage.md`、`2026-09-26-p6-minute-capacity-smokes.md`、`2026-10-21-v22-c3-gap-recovery.md`。 | 已完成（已有范围） | 容量数值是本机合成/隔离环境证据，不代表Ubuntu或生产容量。 |
| 历史股票池/上市退市/公司行动/规则有效期关联，缺证据时限制或阻断回放 | `2026-10-21-v22-c3-history-context-gate.md`、`2026-10-22-v22-historical-context-mapping.md`：不可变引用、Hash/结构/覆盖门禁、缺项限制及 V2.3 前置阻断；当前来源事实仅所有者声明。 | 已完成（限制用途门禁）；实际历史事实未验证 | 不可将结构 READY 解释为历史事实真实。`HISTORICAL_RESEARCH`关闭时禁止正向研究回放。 |

## 正式 Web 与第 7 节门禁

实际 `/acceptance/v2/v2.2` 页面 `V22Acceptance` 提供 Fixture 预览/导入、CSV/Parquet 上传映射、预览、错误/结果原始数据及 normal/rejection/recovery 场景。当前候选真实TestRun将上传、指定证券/日期查询、覆盖、两个独立DataVersion比较和分钟/日线聚合断言汇集并导出；CSV服务和Parquet数据库重启恢复复验、完整code suite均通过。Web工程交付与当前候选人工验收均已PASS；签署仅覆盖本地合成/Fixture软件闭环。

历史审计已证明自动代码套件、4 个 Web TestRun、同 Run CLI `--check-only` 与证据导出通过；CSV 16k 进程重启和 Parquet 100k PostgreSQL/服务重启续传也有旧证据。此前证据不等同于当前候选人工验收；该缺口现已由项目所有者对当前TestRun的明确确认补齐，签署边界见本审计末尾的当前候选补充记录。

| 第 7 节 | 复核状态 | 依据 |
|---|---|---|
| 契约、结构、场景冻结 | 已完成 | 阶段记录及现有合同/Fixture证据。 |
| 第 2 节后端任务 | 已完成（软件交付） | MinuteBar上下文合同、未知值默认与引用约束、质量检查、旧JSONB读取兼容已实现；定向测试及隔离真实链通过。权威逐Bar状态/限价事实仍无来源输入，因此数据事实保持UNKNOWN，不视为事实验收通过。 |
| 正式 Web 与验收场景 | 已完成（自动工程验证） | 当前候选真实TestRun及五项PASS断言见[当前候选复验审计](./2026-10-23-v22-c3-current-candidate-combined.md)；报告中的数据覆盖为INCOMPLETE，80根UNKNOWN。 |
| 命令、URL、Fixture、配置和第 8 节可执行手册 | 已完成（可执行手册） | 固定隔离命令、实际运行动态URL规则、输入/Hash/超时和清理均已补录；完整执行证据见当前候选复验审计。 |
| 开发者按第 8 节完整执行 | 已完成（自动流程） | V2.2完整code suite最终退出0；normal/rejection/recovery/current-candidate TestRun同Run CLI核验及证据导出通过。 |
| 重复/恢复与观察 | 自动恢复复验已完成；来源事实观察仍未完成 | CSV服务重启及Parquet PostgreSQL容器重启复验PASS，精确输入/Hash见当前候选复验审计；来源事实和用户人工操作不是自动恢复证据。 |
| 用户当前候选 Web/命令人工验收 | PASS（2026-10-23） | 项目所有者确认当前候选；TestRun及Manifest绑定见[结构化签署](./2026-10-23-v22-c3-current-candidate-human-acceptance.json)。 |
| 操作文档/限制及验收表同步 | 已完成（当前工程范围） | 第8节状态已更新为`VERIFIED_EXECUTABLE`，第7节与V2验收表已同步；用户人工验收及来源/历史事实限制仍明确保留。 |

## 下一步（保持 C3 范围）

1. 把查询、覆盖、版本比较、聚合和Bar上下文字段纳入同一当前候选真实Web→服务→存储场景，并执行当前候选恢复复验。
2. 更新第8节为本候选可执行步骤，冻结候选指纹并执行对应C3 code/Web场景；来源许可关闭时只验收导入/质量/查询软件行为，不运行历史策略回放。
3. 开发者复验及当前候选人工验收均已完成；剩余工作是解决外部来源许可、逐Bar权威事实及正向历史研究回放门禁，不得据此将阶段整体改为PASS。

## 2026-10-23 顺序执行增量

已完成第一项范围内的查询页面实现：V2.2 Web 增加指定DataVersion/证券/日期区间分钟查询、覆盖表以及两个导入版本的Bar级精确比较。Platform 先验证当前用户Session，再用服务身份读取分钟导入；覆盖路由最多处理31个日历日、单证券、5,000根Bar，要求覆盖频率与不可变导入语义一致，复用Market Data的覆盖分类并允许展示`INCOMPLETE`报告。Market Data覆盖计算现在按1m或5m频率生成预期网格。版本比较前会要求市场、频率、复权、时区及单位语义一致。Market Data OpenAPI及生成客户端登记覆盖调用和分页日期边界。

验证：Platform与Market Data TypeScript typecheck通过；Market Data单测143/143通过（包含1m/5m窗口区别）；Platform单测目标文件5/5通过（包括代理授权、频率匹配及日期边界）；Web Playwright新增查询/覆盖/版本差异用例1/1通过（Mock API）；`pnpm contracts:check`通过（JSON 358、Schema 233、Fixture 74及生成器/合同检查）；`pnpm docs:check`通过（最近运行14,219条链接）；`git diff --check`通过。普通沙箱Playwright因loopback EPERM失败；经授权的回环重跑通过。没有外部数据请求。

边界：该增量最初只有Mock页面交互和独立隔离smoke；后续统一当前候选TestRun已覆盖查询/覆盖/比较/聚合，并由项目所有者完成人工验收。权威逐Bar停牌/交易状态与涨跌停价事实没有可信输入，故合同只保证未知值安全处理；跨版本比较超过首1,000条时需缩小日期区间后再比较。



## 2026-10-23 顺序执行增量：分钟聚合与日线参考值对账

- 新增 `compareMinuteDailyAggregate`：按上海交易日排序汇总开高低收、成交量和成交额，精确列出逐字段差值；检查空Bar、重复Bar、跨证券/日期/频率、非RAW、非法OHLC及非有限/负值。
- Market Data新增 `POST /v2/minute/imports/{version}/daily-aggregate-check`，Platform V2.2 Session代理到服务端。单日最多读取500根Bar，来源语义必须为匹配频率的RAW。
- V2.2正式页增加六项日线输入、来源名称和引用及结果表。响应保留 `OPERATOR_SUPPLIED_NOT_INDEPENDENTLY_VERIFIED` 与 `NOT_ASSESSED_BY_AGGREGATION`，覆盖状态仍由独立覆盖报告给出。
- 单元测试和浏览器Mock测试覆盖匹配、差异、坏Bar、覆盖声明与页面提交；真实跨服务/PG链路已在隔离PostgreSQL smoke中验证；当前候选人工验收已通过，具体签署见本审计末尾补充记录。

实现验证：`pnpm --dir services/market-data-service typecheck`、`pnpm --dir services/market-data-service exec vitest run tests/unit/minute-daily-aggregate.spec.ts`（6/6）、`pnpm --dir services/platform-api-service typecheck`、`pnpm --dir apps/web typecheck`、`pnpm contracts:check`、`pnpm docs:check`、`git diff --check`通过。V2.2查询页浏览器用例（Mock API）1/1通过，真实隔离Web服务链也通过。未调用外部行情源。

## 2026-10-23 当前候选与人工验收后续记录

本审计前文的“人工验收NOT_RUN”是写作当时的状态，现由后续当前候选统一复验及项目所有者确认更新：TestRun `75300ba9-0807-48f5-80dc-a6cadce18b2c`完成且5/5断言PASS，Evidence Manifest SHA-256 `b95d07c9b2123279990bbf70bc8541f29ff78e12f47cf2f28a96a5e75d10c827`与`evidence.json`实际SHA一致。项目所有者于2026-10-23明确确认当前候选人工验收通过。签署仅限本地合成/Fixture软件闭环；外部许可、逐Bar权威事实、完整覆盖和正向历史研究回放仍未通过，V2.2/C3总体状态保持`PARTIALLY_IMPLEMENTED`。结构化签署及限制见[人工验收记录](./2026-10-23-v22-c3-current-candidate-human-acceptance.json)和[当前候选统一复验](./2026-10-23-v22-c3-current-candidate-combined.md)。


真实链路验证增量：扩展并运行 `pnpm --filter @stockquant/platform-api-service v22:upload-web-http-smoke`。隔离PostgreSQL两库、真实Market Data/Platform服务和Chromium均启动；浏览器通过正式V2.2页上传16,000根合成1m Bar并发布，随后提交日线参考值。服务端从该DataVersion读取600000.SH指定交易日的160根Bar，返回`MATCH`、开10/高10.2/低9.9/收10.1/量16000/额160000，并带DataVersion、导入SHA-256、未独立核验标记和覆盖未评估标记。匿名请求返回401。当前运行记录：DataVersion `v2.2-import-02da0008ac46`，输入SHA-256 `08033829c37803a619c9d0e8a501a3dae858fafaf7e69dc42b7cfc6b7665b049`；同次完整 smoke 的上传TestRun `8edb891b-73db-4bb5-b2e3-cea95f43ed90`，CLI同Run `--check-only`退出0，四项TestRun证据均已导出，临时数据库清理完成。此合成数据仅验证软件链，不证明任何行情来源或人工验收。


## 2026-10-23 顺序执行增量：MinuteBar上下文合同

- 新增规范`MinuteBar`和`MinuteBarPage` JSON Schema，并生成平台/Market Data TypeScript合同类型及分钟分页Client类型。
- Bar逐条含`tradingStatus`/`tradingStatusReference`和`limitPriceReference`（状态、上下限、MarketRuleSet版本、来源引用）。导入没有事实时固定为`UNKNOWN`、引用/价格为null；`TRADING`/`SUSPENDED`需要引用；限价`AVAILABLE`需要两个非负边界、规则版本及来源引用；`NOT_APPLICABLE`也需要来源引用。拒绝无引用状态、无效限价边界和无依据`AVAILABLE`声明。
- CSV/Parquet/Fixture新Bar默认带未知值；旧PostgreSQL JSONB Bar在分页出口补齐未知字段，不执行存量改写。质量验证仅在附有完整限价引用时检查OHLC边界；有引用的SUSPENDED与已存在Bar冲突时报告异常。
- 验证：Market Data/Platform/Web typecheck；Bar上下文、CSV映射、质量检查和聚合定向单测31/31；contracts JSON 360/Schema 235、fixtures 74通过；docs link 14,221通过。隔离PG + Platform + Market Data + Chromium smoke PASS，验证新Bar及模拟旧JSON缺字段读取标准化；TestRun `a1812cea-2145-4e04-bd16-32943009b1fc`的CLI同Run检查退出0，临时测试库清理。聚合记录DataVersion `v2.2-import-bdff9a9d6c28`，SHA-256 `08033829c37803a619c9d0e8a501a3dae858fafaf7e69dc42b7cfc6b7665b049`；外部行情请求0。
- 该合同完成字段结构和 fail-closed 规则，不表示已有可引用的历史停牌/涨跌停事实；归档数据仍保持未知值，不据此通过历史事实验收。
