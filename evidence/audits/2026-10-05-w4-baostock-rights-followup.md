# W4 BaoStock rights follow-up and written inquiry draft

Date: 2026-10-05. Status remains `UNCONFIRMED`; no BaoStock API/session, data endpoint, account, or provider was accessed. This is a desktop review and a draft for the project owner to send; no message was sent.

## Public official information reviewed

The current [BaoStock official homepage](https://www.baostock.com/) describes a knowledge base for API guidance, update times and supported data ranges, a platform access-rules page, and lists `baostock@163.com` and an official QQ group for support. The publicly indexed homepage content does not itself establish the license terms or answer the project-specific use questions below. The prior [2026-10-03 source-rights review](./2026-10-03-w4-data-source-rights-review.md) remains valid: client-package software licensing and historical local files are not evidence of a data license.

## Written confirmation required before enabling any source gate

The owner should obtain a written answer tied to this project's actual use, and preserve the response or governing terms with date/version and scope. Ask BaoStock to confirm:

1. Whether automated, scheduled access from a self-hosted service is allowed, and which current API/transport, account type, and authentication may be used.
2. Whether access is limited to personal learning, or also permits this private software project's internal quantitative research and backtesting.
3. Whether collection and persistent storage are allowed for daily and minute bars, adjustment factors, security master, trading calendar, and historical revisions; ask for maximum history and retention periods.
4. Whether data may be used to drive a non-executing simulated account / FakeBroker Paper workflow, and whether that differs from research/backtesting use.
5. Whether derived features, model artifacts, aggregate statistics, logs, screenshots, or internal reports may be retained; identify any output that could expose raw or reconstructible source data.
6. Whether data may be accessed by the project's isolated research containers and how many project users/hosts/IPs are allowed.
7. Exact request-rate, concurrency, daily-volume, IP-ban, caching, attribution, deletion, and incident/reporting requirements.
8. Whether any of the above requires a paid agreement or separate exchange/data-provider permission, and ask for the applicable written terms or contract reference.

Suggested inquiry (owner may edit before sending):

> 主题：确认 BaoStock 数据用于个人 StockQuant 项目的自动化研究与留存范围
>
> 您好，我们在评估将 BaoStock 用于个人自托管的 A 股研究平台。计划通过贵方公开 API 定时获取日线/分钟线、复权因子、证券信息和交易日历，将原始数据保存在本地受限数据库中，用于历史研究、回测和 FakeBroker 模拟账户的只读/模拟流程；不会连接真实券商，不会公开或转售原始数据。隔离的研究容器可能读取已存储数据，平台会保留数据版本、来源时间与处理审计记录。我们暂不启用接口，直到获得书面确认。
>
> 请确认上述自动化访问、内部研究/回测、模拟交易用途、分钟与日线数据的本地持久化/留存期限、研究容器访问、衍生特征/模型结果留存、用户数/主机/IP数、请求频率/并发/日限额、署名和删除要求是否被当前服务条款允许；如部分不允许，请列明具体范围及替代许可/合同。也请提供当前适用条款链接或版本、生效日期，并说明是否需另行取得交易所/第三方数据授权。
>
> 谢谢。

## Gate and next action

Until the owner reviews and receives a written answer, keep all `HISTORICAL_RESEARCH` and `MINUTE_COLLECTION` source authorization variables unset, keep `NO_TRADE`, do not call provider endpoints, and do not use the existing archive as production/research-authorized data. A vendor response is an input for the project owner to decide; it is not auto-authorization. After approval, record the exact permitted source IDs, data classes, use, retention, rate limits, and evidence reference in OD-008 and the corresponding authorization record before any provider call.
