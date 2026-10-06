# W9 version gates after W8 backup-contract verification

Date: 2026-10-02 (Asia/Shanghai)

The current V1, V2 and V3 release gates were rerun after recording the W8 offline backup test evidence. All three correctly remain `INCOMPLETE` and return exit code 2. Their evidence audits pass: V1 48 references / 8 manifests / 9 entries; V2 166 / 27 / 50; V3 174 / 38 / 45. The 14 stage-document audits pass, with no missing evidence, manifest hash failures, duplicate/missing/unexpected acceptance rows, or unresolved V3 evidence associations.

V1 retains 17 unresolved historical TestRun associations; V2 retains 6 unresolved associations from 10 recorded IDs. V3.1–V3.4 remain `NOT_RUN`, despite the V3.3 engineering suite and V3.4 offline backup contracts passing. Those tests are not the required business scenarios, Ubuntu migration or user sign-off.

The W8 run exercised only offline contracts. It produced no real backup and did not stop writers or Artifact publishers, install a timer, or touch the active stack. NO_TRADE and no market-source authorization remain in force; O1 is still 8/20, with no new observation day counted. Real provider and billing checks, O2/Paper, deployment-host backup/restore, actual Ubuntu observation and applicable human acceptance remain outstanding.
