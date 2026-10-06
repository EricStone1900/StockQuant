# W9 Historical TestRun export availability check

Date: 2026-10-02

## Method

Enumerated exact unresolved TestRun UUIDs from the current V1 and V2 version-gate outputs, then used the official `pnpm evidence:export -- --stage <stage> --run <UUID>` command against the local loopback Platform API with its local session. This is a read-only lookup followed by a local export only if the exact record exists. No scenario was rerun, no database was modified, and no external endpoint was contacted.

## Result

The 17 unresolved V1 TestRuns and six unresolved V2.1/V2.2 TestRuns all returned HTTP 404 from the current official API:

- V1.1: `d5add8bf-ae44-48a8-b726-b4be34ab4278`, `24276340-2e5a-4516-a7d0-20f92851754b`, `bdb53484-19b4-4363-a130-eee94761df54`
- V1.2: `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`
- V1.3: `39c9b7c0-080d-45d7-83cf-b8865f6a4b42`, `d1540cb1-d085-40bf-860d-43031951bd55`, `5a817c7f-64c0-4c8d-a979-97b44fc9f6ed`
- V1.4: `78a5c084-abdb-4e50-b451-9787d85b0c1c`, `82b1d78a-00f1-4f61-b069-29b94e7aab95`, `538be4e9-1ece-4c50-b451-9787d85b0c1c`, `cca8143b-530a-4e63-8689-b32b778be752`, `fca91ddc-0b3d-44f2-92ed-66a0dbece151`, `4a1d06f2-94c9-4dc4-a3b1-196c409363ef`, `7ca7581b-8003-4e9d-af2e-a62e7eb211a1`
- V1.5: `25fe0718-5a76-4477-a02b-5e954f621dde`, `48e32a09-4901-424f-8585-7b01ab9f83f7`, `113fea95-5fee-42ee-b702-f8423b8a173c`
- V2.1: `dd1792f9-4947-472d-bd9c-2a0399224068`, `9a0d9bb5-7106-4b95-b113-bea633aab576`, `7419dbd9-d635-4ccb-993f-9d66e5f11865`
- V2.2: `2d236506-042b-4e6c-a386-dfbb6553622f`, `55417112-6ee9-4eeb-b252-1e0306048a0e`, `d8c9540e-0ed2-4978-93f9-daaef6dc1e6f`

No empty, synthetic, or inferred bundle was created. Existing signatures, IDs and evidence remain untouched. The current V1/V2 gates therefore stay INCOMPLETE. Recovery requires the original structured exports or an authorized historical database backup that contains these exact immutable TestRun records; current API 404s are not evidence that the historical acceptance events never occurred.

## Active database exact-ID follow-up

Date: 2026-10-02

After the API check, the active local `platform_api` PostgreSQL database was queried read-only for those same 23 UUIDs across both `acceptance_stage_runs` and legacy `test_runs`, with `test_assertions` checked for child assertions. All 23 UUIDs were absent from both run tables and had zero assertion rows. No business payloads or unrelated rows were read. No writes, service restarts, scenario reruns, or external requests occurred. This confirms the active database cannot supply these exports; it does not rule out an authorized historical backup or original export held elsewhere.

## Local Git object follow-up

Date: 2026-10-02

Read-only inspection covered all local refs and unreachable Git objects; no fetch, checkout, ref creation, or garbage collection was run. Across reachable history, 18 of the 23 UUIDs occur in committed requirement/acceptance documentation only, with no structured evidence bundle in committed evidence paths. Of the unreachable blobs, 78 contained one or more of the exact UUIDs; all 78 begin as Markdown text. Parsing their fenced JSON blocks found no object carrying an exact historical `testRunId`. The other five UUIDs were not found in reachable commit content. The dangling objects were left untouched. This avenue therefore adds no recoverable structured TestRun evidence; it does not rule out external exports or a separate backup outside this repository.
