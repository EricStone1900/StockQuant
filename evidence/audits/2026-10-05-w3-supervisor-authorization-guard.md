# W3 supervisor source-authorization guard (2026-10-05)

The DC-08A supervisor repair path previously restarted Market Data and set both Scheduler/Executor flags to 1 whenever readiness was unhealthy. Runtime authorization still prevented collection, but the repair action itself did not verify approval and could configure enabled flags while source authorization was absent.

Activation and supervisor scripts now use one shared configuration evaluator for the explicit use flag, authorization reference, data version, configured sources and exact source-ID allowlist. In repair mode, incomplete authorization returns WAITING_CONFIGURATION/exit 2 before Compose. Check-only mode continues reporting observed health accurately and does not mask infrastructure failures as authorization failures.

Verification passed: activation 10/10, supervisor 6/6, shared config 3/3, and Market Data runtime authorization 4/4. The runtime authorization test explicitly proves that a blank data version fails closed. No real supervisor repair, Compose call, provider request, database read/write, or service restart was performed.

Current source authorization remains NONE and NO_TRADE remains in effect. This is a local code guard, not source permission or a W3 acceptance result.
