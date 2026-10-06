# O1 automation authorization-boundary review

Date: 2026-10-06 (Asia/Shanghai)

## Current automation files

Read the local Codex automation metadata in `~/.codex/automations` without changing any task:

| ID | Status | Scope |
|---|---|---|
| `a-20` | ACTIVE | DC-08A巡检心跳；readiness GET, observation summary, enabled-subscription count, expiry check only. Its prompt explicitly forbids collection, source probes, `monitor`/`eod`/`morning`, business writes, and enabling the subscription. |
| `dc-08a-2` | PAUSED | 日终质量告警；requires explicit source authorization and explicit resume. |
| `dc-08a-20` | PAUSED | 20只证券切换任务；does not modify a subscription unless its guarded workflow is resumed. |
| `dc-08a` | PAUSED | 启用守卫. |
| `stockquant-tdx` | PAUSED | TDX上午候选探针；prompt requires authorization and explicit resume. |
| `stockquant-tdx-2` | PAUSED | TDX收盘候选探针；prompt requires authorization and explicit resume. |
| `stockquant` | PAUSED | Migrated legacy巡检, with no commands. |

The active heartbeat is consistent with the current `NO_TRADE` / source-authorization-NONE boundary. It preserves monitoring while preventing any source probe, collection, subscription activation, or business write. No automation was created, resumed, paused, or edited in this review. The active service/container state was left unchanged.

## Implication

O1 remains `WAITING` at 8/20 because the authorized monitor is status-only and no subscription is enabled. O1 cannot gain an observation day until source authorization and subscription scheduling are explicitly resolved; the paused TDX candidate jobs do not create observations. Do not resume or enable them based on this review.
