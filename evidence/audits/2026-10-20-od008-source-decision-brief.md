# OD-008 source decision brief — V2.1

Date: 2026-10-20. This is a source screening brief for the project owner. It is not legal advice, a provider capability PASS, or authorization. Only official public pages were reviewed. No quote, news, or historical-data API endpoint was called.

## Candidate paths in the current code

| Purpose | Source ID | Current configured endpoint/path | Evidence status |
|---|---|---|---|
| A-share quote | `tencent-quote` | `https://qt.gtimg.cn/q=...` | Source guard is active. The official Tencent service agreement says product-specific services may have separate terms; no quote-endpoint-specific grant for this adapter was found. Automated use, frequency, retention, and coverage remain unverified. |
| A-share quote alternative | `sina-quote` | Candidate Sina quote adapter; exact permitted endpoint/use needs to be specified in the source authorization | Source guard is active. The visible Sina Finance agreement requires prior written authorization for certain access/use and restricts copying/robot or spider collection; the agreement may not determine every endpoint's terms. |
| News | `eastmoney-news` | Current code requests `https://finance.eastmoney.com/` | The official Eastmoney user agreement is effective 2025-07-18 and says product content belongs to Eastmoney or relevant rightsholders and use/derivative works require prior written permission. The page does not establish an automated news feed or durable local archive grant for this project. |
| News | `cls-news` | Current code requests `https://www.cls.cn/` | CLS's official visible user agreement grants personal, non-transferable, non-exclusive use of its software/service and incorporates additional service rules. No project-specific automated collection, storage, revision, or reuse grant was found. |

The current news routes fetch homepage URLs. They do not yet evidence stable article feed endpoints, full article fields, revisions, coverage, or provider-side retention rights. A public page returning data or a Fixture parser passing does not establish those capabilities.

## Official public material reviewed

- [Tencent Service Agreement](https://www.tencent.com/zh-cn/term-of-service/): last revised 2022-09-13; it directs users of Tencent products/services to the terms for the specific product or service. No endpoint-specific quote collection permission was located in this review.
- [Sina Finance User Agreement](https://finance.sina.com.cn/roll/2021-05-12/doc-ikmxzfmm2033220.shtml): displayed version effective 2020-09-23. Sections 2.5, 6.1–6.2, and 10.1 cover unauthorized use, copying, and robot/spider access; the exact endpoint scope still needs confirmation from the relevant rights holder.
- [Eastmoney User Service Agreement](https://about.eastmoney.com/home/protocol): effective/updated 2025-07-18. Sections 6 and 7 cover content/IP and restrictions; it does not by itself grant this project automated news collection or archive rights.
- [CLS User Agreement](https://image.cls.cn/html/privilege/agreement.html): visible agreement describes a personal, non-transferable, non-exclusive software/service license and incorporates additional service rules; automated collection/archive rights were not confirmed.
- [BaoStock official access rules](https://www.baostock.com/blacklist): the page states a 50,000 API requests/day limit and no concurrent connections, with temporary blocking. This is an access rule, not permission for the project's intended research, storage, or Paper use.

## Owner decision required before any real-source call

For each of one quote source and two news sources, provide or identify a written license/permission that names the exact endpoint/feed, user/entity, intended personal research and simulated-Paper purpose, A-share universe, collection frequency and limits, allowed fields, local storage and retention duration, revision handling, derived outputs, sharing/redistribution, and attribution. If the proposed public endpoints do not have suitable written terms, choose licensed feeds/providers instead. Also decide the maximum local retention period for raw quote/news content and the test request budget.

Until these source-specific facts are recorded, keep all source authorization flags disabled, keep the external request budget at zero, and use versioned Fixture data only. The owner may instead defer real sources and keep OD-008 OPEN; this does not authorize the adapter to call any provider.

## Owner response on 2026-10-20

The owner replied: “这些源都是免费的，请直接使用” (“These sources are free; use them directly”). This records the owner's preference to use free sources, but it does not identify the exact quote/news endpoints, scope, limits, fields, retention, redistribution terms, or a source-specific written grant. Under the V2 delivery rule that personal confirmation does not replace evidence of source rights, OD-008 remains OPEN and no live request was made.
