# P1 V1.5 isolated interactive stack

Date: 2026-10-07 (Asia/Shanghai)

This audit closes the interactive-environment lifecycle slice for V1.5 and the five-stage P1 environment checkbox only. It does not close V1.5 business acceptance, P1 overall, or V1 release.

`pnpm stack:up -- --stage V1.5` launched isolated project `sq-v15-stack-d2e239bfd22aa2a378b8`. The containerized formal Web page `http://127.0.0.1:49903/acceptance/v1/v1.5` returned HTTP 200. The stack used an isolated PostgreSQL with SCRAM-SHA-256 host authentication, random per-project role and superuser passwords, random service tokens, and pinned NATS JetStream / Temporal images. Credentials and state were stored with mode 0600 in the ignored `.codex/isolated-stacks/` directory. The environment reported FAKE broker mode and disabled LIVE trading.

The Platform real NATS probe published the same message ID twice and returned `status=PASS`, `streamMessages=1`, and `duplicateEventIdempotency=true`. Temporal CLI cluster health returned `SERVING`. These are actual isolated component checks. The V1.5 scenario business engine remains WAITING; no claim is made that a workflow worker, order lifecycle, 60-day observation, dual-worker race, sleep recovery, or backup/restore is complete.

After the initial run, the V1.5 Compose overlay was tightened to explicitly disable inherited V1.4 test-delay hooks. A clean rerun on project `sq-v15-stack-70a462189477cbbd2c16` again returned Web HTTP 200, NATS probe PASS with one stored message, and Temporal `SERVING`; exact-project stackdown and harness cleanup passed again.

`pnpm stack:down -- --project sq-v15-stack-d2e239bfd22aa2a378b8` requested the private stop marker. The foreground harness reported `MANUAL_STACK_CLEANUP_VERIFIED`; the stop command reported `STOPPED_AND_PURGED`. Project containers, PostgreSQL/NATS/Temporal volumes, network, project images, and private env/state files were removed. Human acceptance remains `NOT_RECORDED`.

The five V1 stage stacks now each have an isolated lifecycle audit: V1.1 and V1.2 earlier audits, V1.3 and V1.4 incremental audits, and this V1.5 audit. This evidence verifies interactive stack availability and exact cleanup only. The P1 shared-contract publication, persistent TestRun dispatch, full Artifact lifecycle, and activity-storage migration/rollback remain open.
