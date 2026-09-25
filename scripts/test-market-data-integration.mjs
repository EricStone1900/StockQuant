import { spawnSync } from "node:child_process";

const connectionString = process.env.MARKET_DATA_TEST_DATABASE_URL ?? "postgresql://market_data_test@127.0.0.1:5433/market_data_test";
const parsed = new URL(connectionString);
const databaseName = parsed.pathname.replace(/^\//, "");
if (databaseName === "market_data" || parsed.username === "market_data") {
  console.error("refusing to run market-data integration tests against the formal market_data database; set MARKET_DATA_TEST_DATABASE_URL to an isolated database");
  process.exit(2);
}

const result = spawnSync("pnpm", ["--filter", "@stockquant/market-data-service", "test:integration"], {
  stdio: "inherit",
  env: { ...process.env, MARKET_DATA_DATABASE_URL: connectionString },
});

process.exit(result.status ?? 1);
