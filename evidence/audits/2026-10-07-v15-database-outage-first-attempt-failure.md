# V1.5 PostgreSQL process outage E2E: first attempt failure

Date: 2026-10-07

The first process-level PostgreSQL outage attempt failed and is retained here as an execution history item, not counted as a pass. In isolated project `sq-v15-e2e-9d451d4d6f56c45d1804`, normal browser workflow timed out after the outage; PostgreSQL recovery did not restore the downstream services because Portfolio Risk, Trade Execution, and Quant processes had exited on idle pool-client errors. Temporal subsequently failed its Portfolio activity with a service lookup error. The exact project resources were cleaned.

The initial machine JSON was later replaced by the successful retry at the harness’s fixed output path, so this note preserves the observed result without fabricating a source hash or a machine report. The follow-up added sanitized PostgreSQL pool error listeners to affected services, retried NO_TRADE activities up to five attempts, and tightened the outage timing to require a same-sequence NAK/redelivery assertion. The later passing run and current source hashes are recorded in [the successful outage audit](2026-10-07-v15-database-outage-e2e.md).
