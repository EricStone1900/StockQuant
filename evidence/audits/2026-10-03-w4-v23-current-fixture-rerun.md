# W4 V2.3 current Fixture suite rerun

Date: 2026-10-03 (Asia/Shanghai)

Command: `pnpm verify:stage -- --stage V2.3 --suite code`

The default sandbox attempt stopped at Qlib Worker's test-only loopback bind with `PermissionError: [Errno 1] Operation not permitted`. The same command was rerun with controlled local loopback permission and exited 0. The isolated suite used pinned Qlib 0.9.6 and LightGBM 4.7.0 in a network-disabled Linux/amd64 container emulated on Apple Silicon; no market-data source, model provider, broker, or active service was called.

The suite created V2.3 TestRun `5595be61-15b5-4bf9-8b1a-0c3985db98d7`, bound to 168 workspace inputs with `codeVersion=sha256:d3149212349520afc315a479abf79ea742177e5ba1b258ae1049927c0550b15e`. Qlib fit/predict used the 120-row synthetic Fixture and 72/24/24 chronological split. It produced 24 finite predictions, passed temporal validation, and repeated model/prediction hashes matched. The model, prediction and exported Artifact were persisted; owner read returned 200 and foreign-owner read 403. Independent validation is explicitly `NOT_RUN`; no profitability claim was made and candidate execution was not performed.

The same-run CLI `--check-only` returned 0 without mutation. The evidence bundle and manifest are [evidence.json](../../evidence/local/V2.3/5595be61-15b5-4bf9-8b1a-0c3985db98d7/evidence.json) and [manifest.sha256](../../evidence/local/V2.3/5595be61-15b5-4bf9-8b1a-0c3985db98d7/manifest.sha256); both manifest entries were verified. Test output confirmed cleanup of temporary PostgreSQL databases/network, Qlib containers/image, and shared content directory.

This closes only the current synthetic-Fixture code-suite rerun. Authorized real market data, production research/PIT, independent validation, actual Ubuntu x86_64 evidence, and new-scope human acceptance remain NOT_RUN. V2.3 remains `PARTIALLY_IMPLEMENTED`.
