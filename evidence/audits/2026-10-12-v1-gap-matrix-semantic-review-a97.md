# V1 P0 semantic review A97: Artifact durability on Linux ARM64

Date: 2026-10-12  
Requirement: `V1.1-S2-L20`  
Responsibility package: P1

## Finding

A96 recorded directory-entry fsync for the shared immutable content store after publication and verified removal. This follow-up runs the package tests on the target Linux ARM64 architecture as well as native macOS: `node:24.1.0-alpine` image `sha256:a909cdd91e23825346b4c716ed057ad2e66e8ee58dc9417a3e8ea39bf3c6d936`, container network disabled, source mounted read-only, `--rm`. All six tests passed, including same-address concurrency, exact readback, path/symlink protections and verified removal.

The first launch record a01 is retained as an attempt; Docker replaced the stale cached AMD64 tag with the ARM64 variant during startup, so its pre-run image inspection does not identify the runtime image. The canonical a02 record inspects the pulled image before launch and records its exact ARM64 digest.

## Boundary

This verifies the shared package on Linux ARM64 in a disposable container. It does not prove the Ubuntu target host, active named-volume crash durability, cross-owner reference authority, retention policy, scheduled reclamation, paired backup/restore or human acceptance. No active volume was mounted; the source bind was read-only and the container was automatically removed. L20/P1 remain OPEN.

## Matrix update

A97 derives from A96 and adds only the Linux ARM64 execution environment/evidence to `V1.1-S2-L20`. It does not close the parent lifecycle requirement or substitute for the Ubuntu host gate.
