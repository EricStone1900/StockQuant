# V1.5 Platform restart recovery E2E failure history

Date: 2026-10-07. This record preserves a failed attempt; it is not acceptance evidence.

The isolated project `sq-v15-e2e-4777f5cc14fdb7c210da` created normal TestRun `746ebe09-a5af-49cd-a6a3-6f7378bc43cf`, stopped and restored its project NATS, then restarted Platform API. Playwright failed after 16.8 seconds while parsing an interrupted run-status HTTP response: `SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input`. Exact project cleanup passed. This note preserves the failure fact and diagnosis from the Harness output after the machine audit was replaced by the later run.

The E2E poll was changed to treat connection loss, non-2xx responses and truncated JSON as no observation while retrying within the existing 120-second bound. The dispatch delay was increased to 30 seconds so Platform restart completes before the outbox Relay first publishes. The follow-up run `06993e55-6e72-4e3b-a95e-82a74d1b728f` passed after the recorded NATS stop/restore and Platform restart sequence; full run evidence is in the adjacent NATS/Temporal dispatch audit.
