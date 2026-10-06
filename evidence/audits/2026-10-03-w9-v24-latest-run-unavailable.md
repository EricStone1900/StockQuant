# W9 latest V2.4 TestRun export check

Date: 2026-10-03

## Method

The current V2 version-gate output identified `bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1` as an unresolved V2.4 TestRun. I requested a short-lived local `sq_session` from the documented `GET /api/v1/session` endpoint, then ran the official read-only `pnpm evidence:export -- --stage V2.4 --run bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1` command. The session cookie was passed in process memory only and was not written to output or evidence.

## Result

The session endpoint returned HTTP 200, but the exact TestRun export returned HTTP 404. No evidence directory was created, no scenario was rerun, and no database or business state was modified. The run remains unresolved; its UUID alone does not establish assertions, completion, a manifest, or user sign-off. Existing historical evidence remains unchanged.

