# V1 Gate Classification Addendum: Actual Ubuntu Evidence

Date: 2026-10-10 (Asia/Shanghai)
Status: instruction-level reconciliation; no requirement lowered and no host operation performed.

## Finding

The 2026-10-09 classification left open whether V1 W8 required a physical Ubuntu host run. The repository owner-provided `AGENTS.md` now explicitly says: “require actual Ubuntu evidence for final migration acceptance” and “Real-time observation and actual Ubuntu runs cannot be replaced by accelerated Fixtures or emulation.” This is a binding project instruction for this completion round. The common delivery rule remains the minimum V1/V2 target-architecture smoke requirement; its separate V3 Ubuntu deployment requirement does not waive the stronger final-migration-acceptance instruction.

Therefore V1 final migration acceptance requires evidence collected on an actual Ubuntu target host. AMD64 emulation or Linux containers may provide architecture smoke evidence but cannot satisfy this final acceptance item. W8 stays NOT_RUN until an authorized actual host run is available.

## Current environment evidence

`pnpm verify:w8:ubuntu-host` was run read-only on 2026-10-10. It reports `BLOCKED`: host OS `darwin`, architecture `aarch64`; container runtime `UNAVAILABLE`; target-host authorization `NOT_CONFIRMED`; approved resource thresholds `NOT_DEFINED`; no deployment or migration was performed. It did not use external network or read credentials. See [preflight log](./2026-10-10-w8-ubuntu-host-preflight-a01.log).

## Required actual-host run inputs and evidence

Before execution, the operator must provide/confirm the Ubuntu x86_64 host, access and authorization, network/storage boundaries, approved CPU/memory/disk limits, maintenance responsibility, and recovery target. On that host, the stage runbook must record OS/kernel and architecture, image and dependency digests, containerized Web/backend build and run, the V1 code/contract/Fixture checks, required stage smoke/E2E evidence, resource use, exact commands and exit codes, and any recovery/cleanup. Preserve failed attempts and label each emulated check as emulated. No production migration or active data cutover is authorized by this document.

This closes only the source-classification question. The Ubuntu execution, host-specific acceptance evidence, and all other V1 gates remain open.
