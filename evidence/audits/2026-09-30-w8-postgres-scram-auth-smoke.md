# W8 isolated PostgreSQL SCRAM authentication smoke

Date: 2026-09-30 (Asia/Shanghai)

## Result

`pnpm verify:w8:postgres-auth` exited 0. The script started the pinned PostgreSQL 16.9 Alpine image in a random temporary container with `--network none`, no host ports, no persistent volumes, and a 0700 temporary directory containing a 0600 random test-only environment file. It initialized the repository's `infra/compose/postgres-init.sql` and checked nine service roles.

For all nine roles, the generated correct password authenticated over the container's loopback TCP path; passwordless authentication and a separate random incorrect password were rejected. `SHOW password_encryption` returned `scram-sha-256`. The temporary container was auto-removed and the script removed its temporary credential directory. A subsequent Docker read-only check found no container or volume with the `stockquant-w8-pg-auth-` prefix.

Exact image: `postgres:16.9-alpine@sha256:7c688148e5e156d0e86df7ba8ae5a05a2386aaec1e2ad8e6d11bdf10504b1fb7`.

## Scope limit

This proves the current initialization script enforces SCRAM authentication for isolated test roles. It does not migrate or alter the active 48-database PostgreSQL cluster, verify its existing password hashes/DSNs, create a real backup, establish an RPO/RTO, or authorize a maintenance window. The production SCRAM migration and paired backup/restore remain pending.
