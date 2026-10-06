# W4 locked Qlib runtime smoke

Date: 2026-09-30 (Asia/Shanghai)

## Result

`pnpm --filter @stockquant/quant-research-service qlib:fit-smoke` completed with exit code 0 after the ordinary sandbox was unable to reach the Docker Desktop socket. The isolated rerun built a disposable `linux/amd64` image on Apple Silicon with image ID `sha256:a5d709b34bd93e2da7f9e6f22f49a6b315cff5f41f1dad2e48ce59291ec38639`, probed Qlib 0.9.6/LightGBM 4.7.0, fitted and predicted twice on the deterministic 120-row synthetic Fixture, reproduced the model and prediction hashes, rejected the overlapping split with HTTP 422, and removed the temporary image. The test segment contained 24 finite predictions. Tracking used temporary SQLite inside the disposable worker.

## Scope

This verifies the locked Qlib runtime and fixture-only `LGBModel.fit/predict` path. It does not use licensed market data, validate PIT or survivorship semantics, create a business TestRun or Artifact, independently validate a candidate model, or establish profitability. The run used amd64 emulation on Apple Silicon; native Ubuntu execution remains NOT_RUN. The user's `NO_TRADE` and no-source-authorization decision remains in force.
