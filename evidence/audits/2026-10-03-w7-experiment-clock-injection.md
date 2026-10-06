# W5/W7 Experiment business-clock injection

`ExperimentService` now requires an injected `ExperimentClock` and passes its time to domain creation and cancellation functions. The domain functions no longer silently construct wall-clock timestamps. Research Automation bootstrap injects its `SystemRunnerClock`; unit tests use a fixed clock and assert exact `createdAt` and `cancelledAt` values.

Validation: 36 unit files / 202 tests pass, and Research Automation lint/build pass. The default sandbox attempt retained five existing restricted-egress loopback `EPERM` failures; the same suite passed under controlled loopback permission. This code-only change made zero provider, market-data, runner-job, or active-service calls. V3.1/V3.3 real business execution and human acceptance remain incomplete.

The complete V3.3 `code` suite also passed with exit 0 after this change. It verified owner-scoped queue/budget behavior, 50,000-row pagination, and isolated two-round Fixture Runner lease takeover after SIGKILL. Its declared scope remains `businessWorkflow=NOT_IMPLEMENTED`, `paperContinuity=NOT_CHECKED`, `businessValidation=NOT_RUN`, and `humanAcceptance=NOT_RUN`; this is not a real RD-Agent/provider or Paper-continuity run.
