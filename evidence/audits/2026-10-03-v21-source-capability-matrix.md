# V2.1 / W4 候选免费来源能力矩阵（当前证据快照）

日期：2026-10-03。该矩阵汇总已有历史探针、当前源码配置与官方公开资料，不执行任何 Provider 请求，不授予或推断行情/新闻许可。状态分为：`OBSERVED_HISTORICAL`（仅代表所引时间/样本）、`CODE_CONFIG_ONLY`（只证明本地实现）、`UNVERIFIED`（缺少当前实测或授权证据）。采集总开关保持关闭，项目为 `NO_TRADE`、来源授权 `NONE`。

| 源 | 许可 / 授权 | 认证 | 批量与本地控制 | 限流/超时 | 历史覆盖/时延 | 时间/状态字段 | 已知实测错误与结论 |
|---|---|---|---|---|---|---|---|
| Tencent 行情快照 | `UNVERIFIED`；未找到适用于项目自动化调用的授权 | Provider 认证要求 `UNVERIFIED`；当前服务强制source authorization guard，未授权拒绝请求 | 源接口可一次传多个代码；历史V2.1以3证券样本。应用入口5秒超时；不可据此声称Provider批量/配额保证 | Provider限额 `UNVERIFIED`；5秒为本地HTTP timeout，不是服务SLA | 快照，无历史回溯覆盖证据；V2.1历史HTTP 200不是当前可用性保证 | 适配器解析报价时间为`observedAt`并附本地`ingestedAt`；Provider字段语义/校时精度`UNVERIFIED`；源Circuit本地HEALTHY/OPEN | 旧盘后探针已证明陈旧值可被识别；任何最近HTTP 200不等于授权或盘中能力通过 |
| Sina 5分钟行情 | `UNVERIFIED`；没有当前项目书面使用许可 | 当前授权状态NONE；Provider认证方案 `UNVERIFIED` | 公开接口按证券请求；当前项目按单证券适配，无供应商批量承诺 | Provider限额 `UNVERIFIED`；本地代码含独立限流/退避/circuit；历史探针5秒与15秒配置不等于供应商限制 | 2026-09-12历史样本3证券各约1,970行，约40交易日；单证券约0.44–0.49秒，仅该次测量；未满足60日 | 返回`day/open/high/low/close/volume/amount`；`day`是Bar时间标签但端点语义/修订语义不完整；本地保留获取时间与来源 | V2.1一次5秒探针超时；DC-04盘后单次15秒窗口切换后成功。盘中延迟/稳定性`NOT_RUN`，不能称活源通过 |
| BaoStock 分钟/日线 | `UNVERIFIED`；缺当前官方数据许可条款和项目用途授权。客户端包许可证不表示行情许可 | 现行官方认证和匿名访问政策未复核；项目不保存可用于授权判断的凭据 | 本地适配器配置可每批最多5证券；该值是项目实现，不是供应商合同能力 | 供应商配额 `UNVERIFIED`；当前项目自有间隔控制、子进程超时和错误隔离 | DC-00历史探针3证券×336行、2024-01-02至01-10，独立会话约7.2秒；旧证据曾有58个实际交易日样本但有稳定性超时，均不能证明当前60日源覆盖 | BaoStock字段由适配器规范化为上海时区Bar时间和OHLCV/amount；当前接口revision/availableAt语义 `UNVERIFIED` | DC-04曾因结果游标未读取而误判TIMEOUT，修复后历史窗口成功；不代表现行官方服务SLA或许可 |
| TDX/easy-tdx 在线分钟 | `UNVERIFIED`；财富趋势官网列出交易所授权渠道；个人PC盘后日线包范围不能授权第三方在线TCP分钟采集/服务端留存 | 在线协议的账户认证/使用政策 `UNVERIFIED`；客户端库协议可连接不等于被授权 | 项目适配器可分批/受控，但未有官方服务接口合同说明 | 服务端限流、可用性及访问政策 `UNVERIFIED`；本地timeout不是服务承诺 | 历史工程样本在特定日返回20证券×48标签；不是长期覆盖保证 | bar标签开始/结束语义未完全解决：锁定协议解码器本身不声明；历史边界记录互相不同 | 2026-09-30边界复核中午休标签差异导致PARTIAL；raw packet解释待合法授权后开展 |
| Eastmoney 新闻 | `UNVERIFIED`；没有新闻内容抓取/存档许可结论 | 当前授权NONE；公开网页曾被访问不证明自动抓取权 | V2.1只记录一个标题样本；批量/分页能力 `UNVERIFIED` | Provider限额/robots/响应SLA均 `UNVERIFIED`；本地5秒HTTP timeout不是源限额 | 单次HTTP 200/一条标题历史记录；无稳定新闻历史覆盖证据 | 原型保存source/title/observedAt/ingestedAt/availableAt/revision；供应商发布时间及更正语义未证实 | 新闻正文/RSS解析与长期更新 `NOT_RUN` |
| CLS 新闻 | `UNVERIFIED`；没有新闻内容抓取/存档许可结论 | 当前授权NONE | V2.1只记录一个标题样本；批量/分页能力 `UNVERIFIED` | Provider限额/响应SLA `UNVERIFIED`；本地timeout不是源保证 | 单次HTTP 200/一条标题记录；历史覆盖`UNVERIFIED` | 与Eastmoney相同；来源更新时间、修订和availableAt须由源语义核验 | 正文/RSS条目解析及跨源去重的真实长期运行 `NOT_RUN` |

## 结论与启用条件

这份报告逐项区分历史技术样本、本地限流配置、源方能力与权利；当前没有任何源同时具备可审查的授权与满足本阶段真实运行门槛的当前验证。故 V2.1 “能力报告”文档产物可审阅，但 Provider 实际通过、新闻源可用、长期/60日覆盖、来源授权和 O1/O2 都仍未通过。启用前须取得逐用途授权、固定授权引用及数据版本，另按场景复测实时请求/限额/时延/错误、新闻修订和历史覆盖；不允许将旧探针、合成Fixture或源代码许可代替这些门槛。

证据基础：[V2.1旧小样本记录](../../docs/evidence-v2.1.md)、[DC-00分钟来源探针](../../docs/evidence-data-collection-dc00.md)、[DC-04适配器与故障切换记录](../../docs/evidence-data-collection-dc04.md)、[本轮许可桌面复核](2026-10-03-w4-data-source-rights-review.md)。官方来源：[财富趋势行情授权](https://www.tdx.com.cn/article/license.html)、[个人版盘后日线下载范围](https://www.tdx.com.cn/article/vipdata.html)、[BaoStock软件包许可证元数据](https://pypi.org/project/baostock/)；这些资料不构成项目行情许可。
