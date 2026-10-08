# P1 contract generation and linux/arm64 compatibility

Date: 2026-10-07 (Asia/Shanghai)

`pnpm contracts:check` exited 0. It validated 289 JSON files (203 schemas and 46 Fixtures), checked generated TypeScript/Python types and all 29 registered client generators for drift, verified 111 consumer compatibility rules and 24 OpenAPI contracts, and passed the 9 contract/Fixture unit tests plus 2 generator-registration tests.

`pnpm verify:compat -- --platform linux/arm64` exited 0. It validated Compose configuration, built the Platform API image from the pinned Node 24.1.0 base, then ran the architecture probe inside the `linux/arm64` image. The host process was `darwin/arm64`; the probe reported Linux, arm64 and Node v24.1.0 without host architecture emulation. The first sandboxed attempt could not access the local Docker socket and exited before build; after approved local daemon access, the same command passed. No remote image pull was required.

This closes the P1 contract/client drift check only. It does not verify account isolation, TestRun/outbox transactions, Artifact ownership/lifecycle, active-storage migration, stage acceptance or human sign-off.

Input SHA-256 values:

```text
9a01d43ac7b75c7c7f44c6900024c2053454c4730df39f45b38ad60f42f83632  package.json
b2d0074d4bf606ec3e6a7603e0cb2c1f81b3e2548dba2c28aaf7e74e9d6e516c  pnpm-lock.yaml
e04d7dce8278ca4bfc4bfa7e9636971f8e7fd2c848521ad2556684840d19a3e7  packages/contracts/compatibility-matrix.json
46bfe9714a53fbdbe3a10995cd1593c0798574e3dde4c4ced0a5cd84c96aeb82  scripts/check-contract-compat.mjs
9131c33eae8708c5b9c2f944451fb55b552dfcff81a134123f785a85383ab9ff  scripts/check-openapi-contract.mjs
dbbd764af94dcabb2d7c1438b4c65f68aec3759777dfa4df4dcc63288d05ee8d  scripts/check-contract-generators.mjs
20dac767a95d1b2af9c512f2fc60a46b41dc3b36f103cb2eab2cbba4689cb8f5  scripts/verify-compat.mjs
e0141b277827cd399c53fcc9cb93e6ad7d9427f56f2d45f2efba5329873e3bf1  services/platform-api-service/Dockerfile
```
