import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const platform = args[args.indexOf("--platform") + 1];
if (!/^linux\/(amd64|arm64)$/.test(platform ?? "")) {
  console.error("usage: pnpm verify:compat -- --platform linux/amd64|linux/arm64");
  process.exit(2);
}

const compose = ["compose", "-f", "infra/compose/docker-compose.yml"];
const run = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    env: { ...process.env, DOCKER_DEFAULT_PLATFORM: platform },
  });
  return result.status ?? 1;
};

const checks = [
  ["compose-config", ["docker", [...compose, "config", "--quiet"]]],
  ["build-platform-api", ["docker", [...compose, "build", "--quiet", "platform-api-service"]]],
  ["run-node-probe", ["docker", [...compose, "run", "--rm", "--no-deps", "platform-api-service", "node", "-e", "if (!process.version.startsWith('v24.')) process.exit(1); console.log(JSON.stringify({ platform: process.platform, arch: process.arch, node: process.version }))"]]],
];

for (const [name, [command, commandArgs]] of checks) {
  const exitCode = run(command, commandArgs);
  if (exitCode !== 0) {
    console.error(`compatibility check failed: ${name}`);
    process.exit(exitCode);
  }
}

console.log(JSON.stringify({ status: "PASS", platform, architectureEvidence: "containerized platform-api-service probe" }, null, 2));
