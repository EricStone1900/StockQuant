# W0 read-only active runtime inventory

A read-only `docker ps --no-trunc` inspection on 2026-10-03 found 13 `stockquant-v12-*` containers running: Market Data, PostgreSQL, Platform API, Research Automation, Web, Portfolio Risk, Historical Replay, Trade Execution, Decision Governance, Temporal, NATS, Quant Research and Qlib Worker. Docker reported 10 as healthy and Web/Temporal/NATS as up without a health marker. The exact container IDs, image references and reported uptimes are in the adjacent JSON snapshot.

This inspection made no changes and only records Docker's point-in-time state. It does not establish that all active images contain the current uncommitted source, that source collection is authorized, or that Paper/observation gates are satisfied. The 13 active containers were left running.
