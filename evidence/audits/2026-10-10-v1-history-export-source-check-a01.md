# V1 historical TestRun export source check (2026-10-10)

This is a read-only source-availability check for the four TestRun bundles reported missing by formal gate a349. It does not change TestRun facts or acceptance records.

| Stage | TestRun ID | Probe result |
|---|---|---|
| V1.2 | `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4` | Owner-scoped GET returned HTTP 404 on all three running local V1.2 Platform API endpoints (ports 37206, 49476, and 3000). No evidence bundle was created. |
| V1.5 | `25fe0718-5a76-4477-a02b-5e954f621dde` | No running V1.5 Platform API container was present to query. |
| V1.5 | `48e32a09-4901-424f-8585-7b01ab9f83f7` | No running V1.5 Platform API container was present to query. |
| V1.5 | `113fea95-5fee-42ee-b702-f8423b8a173c` | No running V1.5 Platform API container was present to query. |

The V1.5 isolated projects had other containers running, including PostgreSQL, NATS and Temporal, while their Platform API containers were absent. Starting those old stacks could resume pending orchestration or outbox work. They were left untouched; no historical command was replayed and no volumes or business records were changed. The existing local evidence-export flow requires an owner session and an API that can read the exact persisted TestRun. These four exports therefore remain unresolved until their original run stores or previously captured exports are made available.

Gate source: [a349](./2026-10-10-v1-version-gate-a349.log). The 404s mean the run was unavailable at the queried APIs; they do not prove that it never existed or that the underlying historical business facts failed.
