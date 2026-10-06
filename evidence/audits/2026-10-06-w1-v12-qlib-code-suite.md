# W1 V1.2 Qlib code-suite coverage and current regression

Date: 2026-10-06 (Asia/Shanghai)

## Result

The V1.2 code-suite plan now calls the existing isolated Qlib fit smoke, and a regression test asserts this stage-specific command is included. The full controlled run `pnpm verify:stage -- --stage V1.2 --suite code` exited 0. The log records baseline, build, lint, typecheck, repository unit tests, isolated PostgreSQL integration, service-auth HTTP smokes, contract checks, Python adapter/operations checks and the Qlib fit smoke.

The smoke built a temporary locked `linux/amd64` Qlib Worker image on Apple Silicon (image ID `sha256:cee05b62602b1d3481bb59a78f2a895b69b106e335de2654992fe3f3914dd732`) and removed its tag afterward. Qlib 0.9.6 and LightGBM 4.7.0 ran `qlib.contrib.model.gbdt.LGBModel.fit/predict` against a synthetic 120-row time split: train 72, validation 24, test 24. It returned 24 predictions; repeated fit produced identical model and prediction hashes; the invalid time split was rejected with 422. Prediction SHA-256 was `09d1563ed1102a87f6e71672e9b1238ce844094aa336cb33efeea6ac995bdbe3`; model SHA-256 was `08d29ca3ccefc37e887928d5a4512a9f63d53edef6cc91b4289e1731ec675695`. No profitability claim or candidate-source execution was made. The Worker used a temporary SQLite tracking database removed with the container.

The default sandbox attempt is retained separately and failed at loopback socket setup with `EPERM`; the same suite then passed in the controlled local context. The successful run and first failure are [logged here](./2026-10-06-w1-v12-code-suite-with-qlib-controlled.log) and [here](./2026-10-06-w1-v12-code-suite-with-qlib.log).

## Limits and remaining acceptance

The V1.2 browser E2E was not run: Vite's default `/api` proxy targets `http://127.0.0.1:3000`, and no isolated Platform API harness is configured. This avoids contacting an active service. The code suite does not establish Web/CLI same-TestRun acceptance, PIT/manual-factor coverage, Ubuntu execution, current human acceptance, or overall V1.2/V1 acceptance. The stage remains PARTIALLY_IMPLEMENTED and historical sign-off records remain unchanged.
