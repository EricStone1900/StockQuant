import { randomBytes } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const image = "postgres:16.9-alpine@sha256:7c688148e5e156d0e86df7ba8ae5a05a2386aaec1e2ad8e6d11bdf10504b1fb7";
const container = `stockquant-w8-pg-auth-${randomBytes(6).toString("hex")}`;
const dir = mkdtempSync(join(tmpdir(), "stockquant-w8-pg-auth-"));
chmodSync(dir, 0o700);
const envFile = join(dir, "postgres.env");
const secret = () => randomBytes(32).toString("hex");
const roles = [
  ["platform_api", "platform_api", "STOCKQUANT_DATABASE_PASSWORD_PLATFORM_API"],
  ["portfolio_risk", "portfolio_risk", "STOCKQUANT_DATABASE_PASSWORD_PORTFOLIO_RISK"],
  ["trade_execution", "trade_execution", "STOCKQUANT_DATABASE_PASSWORD_TRADE_EXECUTION"],
  ["trade_execution_test", "trade_execution_test", "STOCKQUANT_DATABASE_PASSWORD_TRADE_EXECUTION_TEST"],
  ["historical_replay", "historical_replay", "STOCKQUANT_DATABASE_PASSWORD_HISTORICAL_REPLAY"],
  ["decision_governance", "decision_governance", "STOCKQUANT_DATABASE_PASSWORD_DECISION_GOVERNANCE"],
  ["quant_research", "quant_research", "STOCKQUANT_DATABASE_PASSWORD_QUANT_RESEARCH"],
  ["research_automation", "research_automation", "STOCKQUANT_DATABASE_PASSWORD_RESEARCH_AUTOMATION"],
  ["market_data", "market_data", "STOCKQUANT_DATABASE_PASSWORD_MARKET_DATA"],
];
const passwords = new Map(roles.map(([, , key]) => [key, secret()]));
const adminPassword = secret();
const env = [
  "POSTGRES_DB=postgres",
  "POSTGRES_USER=postgres",
  "POSTGRES_HOST_AUTH_METHOD=scram-sha-256",
  "POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256",
  `POSTGRES_PASSWORD=${adminPassword}`,
  ...passwords.entries().map(([key, value]) => `${key}=${value}`),
].join("\n") + "\n";
writeFileSync(envFile, env, { mode: 0o600 });
chmodSync(envFile, 0o600);

function docker(args, { allowFailure = false } = {}) {
  try {
    return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function checkTcpAuth(user, database, password) {
  const args = ["exec"];
  if (password !== undefined) args.push("--env", `PGPASSWORD=${password}`);
  args.push(container, "psql", "-X", "-h", "127.0.0.1", "-U", user, "-d", database, "-Atqc", "SELECT current_user");
  return docker(args, { allowFailure: true });
}

try {
  const initSql = resolve("infra/compose/postgres-init.sql");
  docker([
    "run", "--detach", "--rm", "--name", container, "--network", "none", "--env-file", envFile,
    "--mount", `type=bind,src=${initSql},dst=/docker-entrypoint-initdb.d/10-init.sql,readonly`, image,
  ]);

  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (docker(["exec", container, "pg_isready", "-U", "postgres", "-d", "postgres"], { allowFailure: true }) !== null) {
      ready = true;
      break;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
  if (!ready) throw new Error("isolated PostgreSQL did not become ready within 60 seconds");

  const format = docker(["exec", container, "psql", "-X", "-U", "postgres", "-d", "postgres", "-Atqc", "SHOW password_encryption"]);
  if (format !== "scram-sha-256") throw new Error(`unexpected password encryption policy: ${format}`);
  for (const [user, database, key] of roles) {
    const password = passwords.get(key);
    if (checkTcpAuth(user, database, password) !== user) throw new Error(`valid password rejected for ${user}`);
    if (checkTcpAuth(user, database) !== null) {
      const rules = docker(["exec", container, "psql", "-X", "-U", "postgres", "-d", "postgres", "-Atqc", "SELECT line_number || ':' || array_to_string(database, ',') || ':' || array_to_string(user_name, ',') || ':' || COALESCE(address, '') || ':' || COALESCE(auth_method, 'none') FROM pg_hba_file_rules WHERE type = 'host' ORDER BY line_number"]);
      throw new Error(`passwordless TCP login succeeded for ${user}; hostHbaRules=${rules}`);
    }
    if (checkTcpAuth(user, database, secret()) !== null) throw new Error(`invalid password accepted for ${user}`);
  }

  console.log(JSON.stringify({ status: "PASS", image, network: "none", hostPortsPublished: false, serviceRoles: roles.length, passwordlessConnectionsRejected: roles.length, invalidPasswordsRejected: roles.length, passwordEncryption: format }));
} finally {
  docker(["rm", "--force", container], { allowFailure: true });
  rmSync(dir, { recursive: true, force: true });
}
