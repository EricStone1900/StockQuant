# V1.5 paired backup/restore E2E: third attempt failure

Date: 2026-10-07. This attempt completed the normal/rejection/recovery browser scenarios, made archives of the three PostgreSQL, JetStream and Temporal volumes, restored them into new volumes, and started the isolated stack from the restored copies. The same-Run CLI command returned its documented exit code 2 because the overall V1.5 stage still contains a WAITING automatic-trading assertion. Its structured output showed the restored run and `V1.5-HOLD-002` facts, but the harness incorrectly treated any nonzero code as a restore failure and stopped before validating NATS and Temporal.

The exact random project was cleaned. This attempt is not counted as a pass because all post-restore component assertions had not yet completed. The harness now expects exit 2 and independently checks the returned TestRun ID, PASS status, and 120 authoritative observations before checking restored JetStream ACK state and Temporal history.
