# V2.1 C2 residual gap inventory and focused closeout checks

Date: 2026-10-20. Compared the V2.1 stage requirements, C2-A–F delivery plan, current TestRun behavior and existing component evidence. The owner stated the candidate sources are free and asked to use them directly; this does not identify exact endpoints or provide source-specific written rights/purpose/retention terms, which the approved delivery rules require. No real source endpoint was called; OD-008 remains OPEN and source authorization remains NONE.

## Focused checks completed

| Requirement | Evidence | Result |
|---|---|---|
| Fixture normal/rejection/recovery through container Web, same-TestRun CLI and export | [C2-E run audit](2026-10-20-v21-c2-e-fixture-same-run.md) | PASS for the defined Fixture sub-scenarios |
| Refresh the browser and restore the same normal TestRun | TestRun `8e56907c-379d-4e2a-9370-796f8a3d852d`; Web restored COMPLETED with 6/6 assertions; CLI `--check-only` exited 0; Manifest SHA-256 `f447e44ae440fa8457f921eb01915224a3c82fd3c976bd284e31534f26aae7a2` | PASS |
| Close the V2.1 page and reopen it in the same browser context; restore the same TestRun | TestRun `45ec1df9-68cb-4ae6-83a6-62831ebee881`; reopened page restored COMPLETED with 6/6 assertions; same-run CLI exited 0; Manifest SHA-256 `269725799dd95605ddbff4f4b681d94a3e994210064f1971f173337c1765c26d` | PASS |
| Save and read back 20-minute and 30-minute sampling configuration through Web | 20 minutes persisted/read/displayed at settingsVersion 10; 30 minutes at version 11; `persistence=POSTGRESQL` | PASS |
| Bind the 20/30-minute policy distinction to the normal Web TestRun | TestRun `78ae7e77-6923-4ab7-aa0f-2c865b78550a`; 20-minute policy admitted the fixed 09:50 Fixture tick and completed its task; 30-minute policy rejected that same off-grid tick as `NOT_SAMPLING_TICK` without creating a task. Seven assertions PASS. Same-TestRun CLI `--check-only` exited 0. | PASS for this interval boundary. The 30-minute aligned positive tick remains covered by the existing calendar unit test; this run does not claim an end-to-end 30-minute task because the frozen snapshot Fixture is fixed at 09:50. |
| End isolated infrastructure | Compose project `sq-v21-stack-b2e9f57f4ec693be746a`; `stack:down` returned `STOPPED_AND_PURGED` and removed containers, project volume, network, images and temporary credentials | PASS |

The configuration round trips and browser recovery are directly observed in a containerized Web session. The setting round trips remain a separate global-configuration check; the normal TestRun now also verifies the fixed 09:50 boundary under both policies. An initial attempt to use a 10:00 tick with the frozen 09:50 snapshot Fixture failed with `SNAPSHOT_FIXTURE_INSTANT_MISMATCH` after three bounded retries (TestRun `f819c2c2-21d3-40a0-a955-afa39e5e8115`); this failure is retained here. The corrected Web run uses the same frozen timestamp for both policies and passed. The full normal/rejection/recovery matrix remains incomplete.

## Remaining gaps

| Gap | Current evidence | Required closure |
|---|---|---|
| Actual source rights and capability | OD-008 OPEN; Tencent quote and Sina quote are unauthorized; Eastmoney and CLS news candidates lack project-specific written authorization. Fixture and historical probes do not grant rights or prove current source capability. | Owner records the exact source, endpoint, purpose, A-share scope, frequency/limits, content/storage/retention, derived-data and sharing permissions for 1 quote and 2 news sources. Only then run the bounded source checks. |
| Complete normal/rejection/recovery scenario matrix | Web TestRuns cover normal Fixture flow, the new 20/30-minute 09:50 boundary assertion, 101-security rejection/atomicity, and DAILY_BAR task idempotency/recovery. Separate Market Data HTTP/PG/unit evidence covers aligned calendar ticks, calendar gates, unauthorized sources, source identity, restart, lease/retry and news revision idempotency. | The C2 stage's full local matrix is not unified: rejection TestRun still covers only watchlist capacity, while calendar/quality/news edge cases remain component evidence rather than same-Run Web assertions. Add only the remaining required local assertions; real-source cases remain blocked by OD-008. |
| Strategy and order consumers | After close-scheduled DAILY_BAR, strategy remains disabled behind OD-007 and order execution disabled behind C5; both executors are `NOT_IMPLEMENTED`, `placeOrders=false`. [Gate audit](2026-10-20-v21-c2-strategy-order-gate.md) confirms no implicit activation. | Keep disabled. Decide/implement the C2-required consumer behavior only within the explicitly approved OD-007/C5 boundary; do not equate gate verification with implemented consumers. |
| Final stage code suite and user sign-off | Focused Web, CLI and document checks above passed. No final V2.1 `--suite code` run was performed in this closeout; the user has not signed this new acceptance scope. | Run the applicable final stage suite once the C2 candidate is frozen; preserve human acceptance as NOT_RUN until the user's actual confirmation. |

The stage remains IN_PROGRESS. This inventory does not downgrade component evidence or turn source authorization, strategy/order execution, full-stage validation, or user acceptance into a pass.

## 20/30-minute Web TestRun evidence

- Isolated Compose project: `sq-v21-stack-2c883152e6b46c0be4a1`; Web: `http://127.0.0.1:52736/acceptance/v2/v2.1`; Platform API: `http://127.0.0.1:52733`; Market Data: `http://127.0.0.1:52712`.
- Web-created normal TestRun: `78ae7e77-6923-4ab7-aa0f-2c865b78550a`, COMPLETED, 7/7 assertions PASS. New assertion: `V2.1-SAMPLING-INTERVAL-MATRIX-001`. Scope `market=CN_A`, owner `acceptance-owner-1`, account `94eaea48-2949-4a50-a610-8ae0c0bd2fbf`; `externalRequests=0`; broker `FAKE`; LIVE disabled; human acceptance remains NOT_RUN.
- Same-run `STOCKQUANT_PLATFORM_API_URL=http://127.0.0.1:52733 pnpm verify:stage -- --stage V2.1 --run 78ae7e77-6923-4ab7-aa0f-2c865b78550a --check-only` exited 0 and read the existing run only.
- `pnpm evidence:export -- --stage V2.1 --run 78ae7e77-6923-4ab7-aa0f-2c865b78550a` was attempted and exited 2 because `STOCKQUANT_EVIDENCE_SESSION_COOKIE` was not supplied. No evidence bundle/Manifest is claimed for this run. The app's session credential was not read or copied into the shell.
- The isolated stack was purged after the run; no provider endpoints were called.
