# V1.5 code suite after Temporal Worker restart/retry changes

Date: 2026-10-07. Command: `pnpm verify:stage -- --stage V1.5 --suite code`. Exit code: 2 (`PREREQUISITE_MISSING`).

The current source completed documentation link check (5020/0 failures), contract/Fixture checks, service layer and baseline tests, workspace production builds, and TypeScript typechecks. Unit suites that completed before the aggregate command stopped include Web 1/1, Historical Replay 25, Decision Governance 40, Portfolio 5, Trade Execution 86, Quant Research TypeScript 99, Market Data 74, and Platform API independently reran at 55 files/241 tests. The Quant Python worker harness then correctly returned 2 because the locked test image is absent locally: `python@sha256:e41613d42d4891e4930f79523f93f81bbc7632584ec65e36ab055f41a800b41e`. No pull or build was attempted; the repository's approved-image workflow is required. This is not an aggregate code-suite PASS.

Complete raw output and its SHA-256 are in the adjacent `.log` and `.sha256` files. This prerequisite also remains open in the V1 version gate.
