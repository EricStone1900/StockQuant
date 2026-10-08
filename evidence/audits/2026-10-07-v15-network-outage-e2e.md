# V1.5 isolated Platform network outage and recovery

Date: 2026-10-07 (Asia/Shanghai). Command: `STOCKQUANT_V15_E2E_NETWORK_OUTAGE=true pnpm test:e2e -- --stage V1.5`; exit 0. During normal Run `c29b544c-824c-4518-ba88-48d204fc8873`, the harness disconnected only the Platform API container from the random project's Compose network for three seconds, reconnected it with its service alias, and observed `/live` recover. The same Run completed 120 authoritative observations; normal/rejection/recovery browser flow, same-Run CLI/export and exact project cleanup passed. External source and real broker calls: 0.

The [machine record](./2026-10-07-v15-network-outage-e2e.json) includes timestamps, all Run IDs, Playwright output and source hashes. This covers one bounded isolated Platform network disconnect/reconnect. It does not cover a particular dependency-only network partition, multiworker competition, backup/restore, trade/day-end flows, Ubuntu, or human acceptance.
