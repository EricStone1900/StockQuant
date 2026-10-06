# W9 gate refresh after W5 V3.1 regression

Date: 2026-10-01 (Asia/Shanghai).

The fixed-image V3.1 code suite exited 0. `pnpm baseline:check` passed with 177 JSON files, 116 schemas and 36 Fixture schemas validated; all contract generators and compatibility/OpenAPI checks passed. V1/V2/V3 evidence-reference checks all passed with zero broken references. `pnpm verify:version -- --version V1|V2|V3` remained correctly INCOMPLETE (exit 2), with unresolved stages V1.1; V2.3–V2.5; and V3.1–V3.4 respectively. Missing and unexpected Acceptance IDs were zero. This refresh records current gates only; it does not change any business or human acceptance status.

Machine-readable result: [JSON](./2026-10-01-w9-after-w5-v31-regression.json).
