# V1.5 code suite with pinned Python image available

Date: 2026-10-07 (Asia/Shanghai). `pnpm verify:stage -- --stage V1.5 --suite code` exited 0 using the exact locally cached Python 3.11 digest (`linux/arm64`). No image pull or build occurred; the worker tests ran with network disabled.

The complete required code suite passed: contracts and fixtures (289 JSON files, 203 schemas, 46 Fixtures), workspace/service build and type checks, all listed unit suites (including 14 Python Worker tests), and V1.5 stage code checks. The run log is [here](./2026-10-07-v15-code-suite-pinned-python-available.log); exact image identity, counts and boundaries are in the adjacent JSON.

This closes the missing-image prerequisite for the V1.5 code suite only. It does not close V1.5 business recovery scenarios, actual Temporal-server outage, database/network/multiworker fault recovery, backup/restore, target Ubuntu or human acceptance.
