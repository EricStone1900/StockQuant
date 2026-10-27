# C2 新闻获取工程与进程崩溃恢复

日期：2026-10-21。C2保持IN_PROGRESS。本次完成本地文章获取链与三种进程故障验证；OD-008来源权利和实际来源验收仍未满足。

## 实现与验证

新闻入口复用现有GET `/v2/news/live`、Platform生成客户端和Web操作，授权先于Provider请求。原来直接对首页应用文章解析器，现改为首页发现→同来源受限文章路径→稳定canonical ID/标题/时间→共用`collectV21News`→修订账本→跨源去重及出处输出。每源每进程30分钟最多1个入口与3篇候选文章请求，并发共享请求且缓存失败；重启清空缓存，此限制不代表跨重启配额或供应商允许频率。禁止跳转、流读取限制1MB、每请求超时1.5秒；只存现有元数据，无正文持久化。未知实体保留UNMATCHED，不增加模型分析。

一源失败返回PARTIAL，保留另一源本次事实和已保存历史；历史成功不冒充本次采集成功。

| 检查 | 结果 |
|---|---|
| Adapter定向单测 | 11/11 PASS，覆盖候选发现、外域/凭证链接排除、缓存/并发、缓存过期修订与来源失败隔离 |
| 两源文章持久链 | [报告](../local/V2.1/06857079-5938-4e32-8b84-77f556f438d8/news-collection.json)：发现→文章→数据库、重复幂等、修订1→2/supersedes=1、跨源出处、未知发布时间、一源失败隔离、重连读回PASS |
| Worker实际崩溃恢复 | [报告](../local/V2.1/ec91b74a-1562-4c5c-8ad5-26bcdc4185bc/crash-recovery.json)：领取后SIGKILL、结果提交后/finish前SIGKILL、暂时失败后进程重启三项PASS |

故障在IPC屏障之后注入。过期前租约不可接管，真实等待1秒租约过期后新进程接管原taskId；attempt=2、两条观测、一条Outbox交接事件，终态不可重复领取。报告保存19条实际事件顺序、宿主darwin/arm64、Node24.1.0、代码与Fixture SHA-256。执行生产SamplingTaskWorker与仓储，执行适配器是Fixture harness；不代表完整容器故障、最终一次尝试崩溃、所有故障组合或Ubuntu通过。

新闻测试从冻结`v2.1-news-revisions-1`标题/时间生成合成HTML，转换和SHA在报告注明。HTTP替身、真实容器PostgreSQL；实际Provider请求0。两个runner均输出容器/网络删除验证PASS，活动服务未连接。工程证据UUID不是Platform持久TestRun或人工签名。

## 重跑

最终静态与自动检查：Market Data全部26文件/129单测PASS、typecheck PASS；服务分层检查最初exit2（两处既有application→adapter类型依赖），将观察类型和Monitor Outbox接口移到ports并保留adapter类型重导出后PASS。该修正仅涉及类型依赖，故障报告源码Hash保留执行时点，不覆盖历史报告。两个新烟测现纳入V2.1 code suite计划；命令计划单测19/19 PASS（修正原来把整个V2.1套件当作公共前缀的比较），文档链接14,058项/0失败、diff检查PASS。没有重跑所有版本或宣称完整V2.1最终套件通过。

从项目根目录进入服务目录；预期两个runner退出0、输出PASS及`container and network removed and verified`，每次产生新证据目录及SHA清单。失败保留，不换seed掩盖。脚本拒绝缺少隔离容器标记的数据库环境。

```sh
cd services/market-data-service
pnpm build
pnpm exec vitest run tests/unit/public-source-http-adapter.spec.ts
node ../../scripts/run-isolated-postgres-command.mjs --url-env MARKET_DATA_DATABASE_URL:market_data_test:market_data_test -- node scripts/sampling-crash-recovery-smoke.mjs
node ../../scripts/run-isolated-postgres-command.mjs --url-env MARKET_DATA_DATABASE_URL:market_data_test:market_data_test -- node scripts/news-collection-persistence-smoke.mjs
```

## OD-008逐源当前核对

| 来源/用途 | 精确候选接口/本地请求约束 | 公开条款与剩余条件 |
|---|---|---|
| tencent-quote / QUOTE | `https://qt.gtimg.cn/q=sh600000,sz000001`，已有批量Adapter和100证券在线上限；拟验收仅2只 | [腾讯服务条款](https://www.tencent.com/zh-cn/term-of-service/)未确认该行情端点自动采集/本地留存的专用许可；允许频率、保存字段/期限、衍生用途及本次实源能力未确认 |
| eastmoney-news / NEWS | `https://finance.eastmoney.com/`及同origin `/a/<数字>.html`；每进程30分钟最多4请求 | [2025-07-18东方财富协议](https://about.eastmoney.com/home/protocol)未找到覆盖本项目自动元数据采集/修订留存的明确依据；实际文章格式、允许字段/频率/期限及转载用途未确认 |
| cls-news / NEWS | `https://www.cls.cn/`及同origin `/detail/<数字>`；每进程30分钟最多4请求 | [财联社协议](https://image.cls.cn/html/privilege/agreement.html)描述个人软件/服务许可且保留未明示权利；无法据此确认项目自动采集/保存，实际结构、字段/频率/期限未确认 |

这些路径规则是候选代码能力，未实际下载页面证明兼容。本轮只读复查官方条款，并筛查BaoStock官方介绍/访问规则、政府新闻/RSS和中新网版权材料；未找到能同时覆盖A股快照、两路新闻和本项目留存要求的替代组合。第三方客户端开源许可证不等于服务端数据许可。

下一项依赖能覆盖上述自动采集与本地保存用途的来源条款/授权材料，或具备该权利的替代来源。所有者“免费直接使用”的偏好已记录，无需重复一般性确认；缺失的是来源侧依据。来源开关保持关闭，实源能力NOT_RUN；未外发询证消息、未订阅/购买。人工验收仍NOT_RUN。
