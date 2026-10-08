# V1.5 multiworker first attempt: harness failure retained

Date: 2026-10-07 (Asia/Shanghai). The first `STOCKQUANT_V15_E2E_MULTIWORKER=true pnpm test:e2e -- --stage V1.5` run completed its browser matrix (normal `f1070108-31e0-4dd5-aa22-a4fc16804f95`, rejection `9873597e-9600-452c-b035-638f56e63522`, recovery `f427a5f5-b120-4dd6-9c0b-dd8aaecbeb92`) but the harness incorrectly fell through to its default NATS outage/Platform restart injection and failed waiting for an activity marker. This is a harness failure, not a product acceptance failure, and does not count as multiworker evidence. The isolated project `sq-v15-e2e-09280789709a1d841a10` containers, volumes and network were verified removed. The failure was corrected by making multiworker mode skip unrelated default fault injection; the subsequent passing run is recorded separately.

The overwritten initial machine JSON identified harness source SHA-256 `79524d39edbcf185153ec869b3ae40f2e825d9120aa6b367256e0e974b9b7507`. The original verbose output was not retained by the runner after the retry; this note preserves the available failure facts without presenting the attempt as a pass.

