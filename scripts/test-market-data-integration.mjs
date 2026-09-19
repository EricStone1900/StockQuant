import { spawnSync } from "node:child_process";

const connectionString = process.env.MARKET_DATA_DATABASE_URL ?? "postgresql://market_data:market_data_local_only@127.0.0.1:5433/market_data";
const result = spawnSync("pnpm", ["--filter", "@stockquant/market-data-service", "test:integration"], {
  stdio: "inherit",
  env: { ...process.env, MARKET_DATA_DATABASE_URL: connectionString },
});

process.exit(result.status ?? 1);
