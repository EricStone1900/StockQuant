# W9 Version Gate Rerun — 2026-09-30 10:15Z

Re-ran the read-only version mapping gate against the current working tree:

| Command | Exit | Result |
|---|---:|---|
| `pnpm verify:version -- --version V1` | 2 | INCOMPLETE; V1.1 remains partially implemented |
| `pnpm verify:version -- --version V2` | 2 | INCOMPLETE; V2.3–V2.5 remain partially implemented |
| `pnpm verify:version -- --version V3` | 2 | INCOMPLETE; V3.1–V3.4 remain NOT_RUN |
| `pnpm verify:version:evidence -- --version V1/V2/V3` | 0 each | Linked local targets exist; no stage-linked SHA manifests were found |
| `pnpm test:ops` | 0 | 146/146 passed after rerunning with permitted local loopback access |

The first sandboxed `pnpm test:ops` attempt ran 145/146 because the V3.3 local HTTP test could not bind `127.0.0.1` (`EPERM`). It passed on the controlled rerun with local loopback access. This is test infrastructure permission, not an application failure.

The commands verify Markdown status mapping, evidence-reference existence, linked manifest hashes, and the operations test suite. They do not establish business acceptance, human sign-off, deployment, observation completion, or completeness of evidence. No service, database, or scheduler was modified. This rerun does not close W9 or any stage.
