# V3.2 browser and scenario re-check (2026-09-27)

## Browser result

`pnpm test:e2e -- --stage V3.2` passed all four Chromium tests against the local Vite application and mocked APIs. The initial sandbox attempt was stopped before tests began because the Vite server could not bind `127.0.0.1:5173` (`EPERM`); the same command in the approved local loopback test environment passed 4/4.

The covered page flows read immutable evidence, explicitly submit the selected V3.1 TestRun and show blockers, perform an explicit exact-version approval action, and request exact candidate-to-Mandate binding while showing activation did not occur.

## Scenario command results

The actual stage commands were run independently with seed `20260927`:

| Scenario | Exit | Result |
|---|---:|---|
| normal | 2 | `WAITING`, `testRunId=null`, `businessValidation=NOT_RUN` |
| rejection | 2 | `WAITING`, `testRunId=null`, `businessValidation=NOT_RUN` |
| recovery | 2 | `WAITING`, `testRunId=null`, `businessValidation=NOT_RUN` |

Each reports the same four blockers: authoritative V3.1 prerequisite acceptance; eligible persisted non-Fixture candidate execution/recomputation from bound Artifacts; Governance and Paper enforcement of the approved version fingerprint; and the V3.2 TestRun workflow plus evidence export.

## Limits

The Chromium suite uses mocked APIs. It does not prove deployed backend behavior, create a business TestRun, execute a real candidate/model, change a Registry or Mandate, or constitute business/human acceptance. The WAITING checks did not create TestRuns. No active service or data was changed.
