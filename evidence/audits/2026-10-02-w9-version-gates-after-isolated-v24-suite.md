# W9 version gates after isolated V2.4 code suite

Date: 2026-10-02 (Asia/Shanghai)

After the isolated V2.4 code suite passed, the three version acceptance gates were rerun. `pnpm verify:version:evidence` passed for V1, V2, and V3 with no missing references or manifest hash failures. The business/version gates correctly remain incomplete (exit 2):

- V1: 5 unresolved stages and 5 unresolved acceptance rows; evidence audit 78 references / 9 manifests / 88 entries passed.
- V2: 5 unresolved stages and 5 unresolved acceptance rows; evidence audit 191 references / 29 manifests / 50 entries passed. This includes the new V2.4 suite hashes and Paper run report; code suite success does not waive all-version acceptance conditions.
- V3: 4 stages remain NOT_RUN and acceptance is unresolved; evidence audit 179 references / 38 manifests / 45 entries passed.

No acceptance row was marked passed from code-suite evidence alone. W3/O1/O2 retain the user-confirmed `NO_TRADE` state and no source authorization; the observation counter does not advance. Ubuntu observation and human sign-off remain pending.
