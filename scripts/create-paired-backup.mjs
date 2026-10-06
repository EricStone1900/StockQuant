process.stderr.write("single-database paired backup is disabled because its restore verifier writes to the active Compose PostgreSQL cluster; use `pnpm backup:create` for the cluster backup workflow\n");
process.exitCode = 2;
