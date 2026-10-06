# Preserved failures during V3.3 ledger-settlement implementation

- First generated-client run after adding the new OpenAPI operation stopped because the generator's expected operation count was still 15; the operation count and diagnostic were updated to 16, then generation and contract checks passed.
- First end-to-end smoke after ledger settlement reached the new persisted workflow step, but its assertion still expected the earlier `RUNNER_RESULTS_RECONCILED` step. The smoke expectation was corrected and the next isolated run passed.
- The first complete suite had 31/32 PostgreSQL integration tests pass. The new unresolved-round test failed while preparing its experiment because it reused a shared test ledger whose stage budget had already been consumed. The test was moved to a dedicated isolated stage budget; the final complete suite passed 32/32 PostgreSQL integration tests.
