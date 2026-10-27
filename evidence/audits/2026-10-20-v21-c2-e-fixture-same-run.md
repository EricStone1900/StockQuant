# V2.1 C2-E Fixture same-TestRun Web/CLI acceptance

## Result

On 2026-10-20, the isolated Compose stack ran the V2.1 acceptance page against the real Platform, Market Data, Monitor and PostgreSQL services. The Web-created TestRuns for normal, rejection and recovery completed with all scenario assertions passing. The same three IDs were then read by `pnpm verify:stage -- --stage V2.1 --run <id> --check-only`; each command exited 0 and returned the persisted assertions without initializing data, placing orders, replaying fills or calling providers.

| Scenario | TestRun | Result | Evidence manifest SHA-256 |
|---|---|---|---|
| normal | `d59212c5-ce50-47c5-ad47-d9de8aba744b` | COMPLETED; 6/6 PASS, including strategy/order gate assertion | `cec57e59754216164ec34af0c817a36bbd3e6c43864423ee08bb73b9828b1809` |
| rejection | `e27e805a-7c13-4403-8529-f16b83b97918` | COMPLETED; 2/2 PASS, stable 101-security rejection and atomicity | `7bde9f1cccc6d7d0200700b24bd07f25063f0f8de2d11e8f24f7b41b2e8462d6` |
| recovery | `6453b02c-7132-48ee-b4fd-a5459c9f2da1` | COMPLETED; 2/2 PASS, idempotent task reuse and recovery readback | `cbbe12003948a7f13f9d9cb807344fa6e1e2444965d23db5ae6169229153aa42` |

Bundles are in `evidence/local/V2.1/<testRunId>/`. The normal Fixture path used versioned snapshot, daily-bar and news inputs; `externalRequests=0`. Strategy evaluation remains disabled behind OD-007, order execution remains disabled behind C5, and `placeOrders=false`.

This closes the C2-E Fixture same-TestRun Web/CLI/export sub-item only. Real-source authorization/capability validation (OD-008), the complete verified operating handbook, the remaining V2.1 stage checks and user acceptance remain NOT_RUN. No human acceptance was recorded.
