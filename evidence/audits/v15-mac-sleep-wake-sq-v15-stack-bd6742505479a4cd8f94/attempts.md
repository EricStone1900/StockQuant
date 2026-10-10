# V1.5 Mac sleep/wake rehearsal attempt history

Date: 2026-10-10 UTC. Project: `sq-v15-stack-bd6742505479a4cd8f94`. TestRun: `1f9b8fd0-9a51-45eb-803d-b613bbd8d126`.

- Initial `pnpm stack:up -- --stage V1.5` was blocked by sandbox `EPERM` on loopback. Controlled local execution started the documented random isolated project and reached `READY_FOR_MANUAL_ACCEPTANCE`; no active project or shared volume was targeted.
- First CLI attempt omitted `STOCKQUANT_PLATFORM_API_URL`, so it queried default `127.0.0.1:3000` and got 404. First export attempt omitted a current local session cookie and returned exit 2. These command/setup failures were corrected; no scenario was recreated.
- Correct same-run CLI attempt used the isolated API URL and a valid same-owner session. It returned exit 2 because `V1.5-SYS-SCHEDULE-001` is intentionally still `WAITING`; `V1.5-HOLD-002` is `PASS`, with 120 authoritative observations, zero orders/fills/reservations, and no AUTO trade. This is incomplete full-schedule evidence, not a business assertion failure.
- Stage-specific `pnpm evidence:export -- --stage V1.5 --run <UUID>` succeeded. Manifest hash: `0b5fadfe98a7ee859db788549e3c957b7fae79858797ce02fbee19b14776c20c`.
- The Mac was locked when native-app state was checked. No sleep/wake event was triggered. The exact random project remains running so the operator can continue the rehearsal after unlocking; do not mark sleep/wake PASS or clean this project until that decision is made.
