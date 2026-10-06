# W1 shared Artifact store rejects leaf symlinks

Date: 2026-10-03 (Asia/Shanghai)

## Change

`LocalArtifactContentStore` now opens existing Artifact bytes with `O_NOFOLLOW`, verifies the opened handle is a regular file, and uses the same path for immutable publish checks and reads. A matching-hash symlink at the Artifact address is rejected rather than accepted as existing content or followed. Removal also reads through a no-follow handle and checks the path still identifies that opened file before unlinking. Platforms without `O_NOFOLLOW` support fail closed.

The regression test points an Artifact address at an external file whose bytes deliberately match the address SHA-256, then confirms read and publish both reject the symlink while the external file remains unchanged. Existing path traversal, namespace symlink, byte tampering, immutable publish, and removal checks remain covered.

## Verification

- `pnpm --filter @stockquant/artifact-content-store test`: exit 0, 5/5.
- `node --check packages/artifact-content-store/index.mjs`: exit 0.
- `pnpm --filter @stockquant/research-automation-service build`: exit 0.
- `pnpm --filter @stockquant/research-automation-service test`: first sandboxed run retained 198/203 passes and 5 local-listener `EPERM` failures; controlled local rerun passed 203/203.
- `pnpm --filter @stockquant/platform-api-service build`: exit 0.
- `pnpm --filter @stockquant/platform-api-service test`: exit 0, 46 files / 166 tests.

No service, database, volume, Artifact bytes, Provider, market source, model, Paper account, or broker was accessed or changed. This hardens the shared local byte reader; it does not implement shared expiry policy, reference-aware cross-service retention scheduling, deployment/cutover, or human acceptance.
