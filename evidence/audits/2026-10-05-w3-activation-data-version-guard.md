# W3 activation source data-version guard (2026-10-05)

Code review found that scripts/dc08a-activate.mjs checked the minute-collection authorization flag, reference and exact source allowlist but omitted STOCKQUANT_COLLECTION_DATA_VERSION. The running Market Data service requires all four, so the activation preflight could proceed to readiness and schedule inspection with a configuration that the service itself must reject.

The activation preflight now also requires a non-empty data version. A regression test asserts that an empty data version returns BLOCKED/exit 2 before readiness, schedule reads or Compose execution. The focused suite passed 10/10. Existing authorized-path tests provide a fixture version and still verify the positive check-only and mocked activation branches.

No activation check, provider call, schedule read, Compose invocation, service restart, database write or trade operation was performed as part of this code change. Current source authorization remains NONE and all runtime collection stays closed.

A companion Market Data runtime authorization test now explicitly checks that blank STOCKQUANT_MARKET_QUOTE_DATA_VERSION fails closed; the focused authorization suite passed 4/4. This confirms the activation preflight and runtime both require the source data-version field.
