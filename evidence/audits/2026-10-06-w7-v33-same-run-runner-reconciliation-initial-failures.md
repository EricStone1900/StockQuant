# W7 V3.3 same-TestRun reconciliation: initial failures

Date: 2026-10-06

Both failed requests used disposable databases and isolated processes; cleanup completed and no active service was connected.

1. The first Runner output publication returned HTTP 422 because the smoke's `sourceRef` did not encode the current Runner Job fencing token. It now uses the exact `runner:<jobId>:fence:<token>` provenance required by the Runner output boundary.
2. The second attempt published successfully but job completion returned HTTP 422 because the completion request used a `PUBLISHED` ref. The Runner Host completion contract requires the original `PENDING` reference; Research Automation independently loads the persisted `PUBLISHED` immutable ref before completing the job. The harness now follows this contract.

The corrected full cross-service reconciliation smoke passed and verified both results in the original TestRun.
