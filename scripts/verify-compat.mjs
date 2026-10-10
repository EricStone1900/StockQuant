import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const platform = args[args.indexOf("--platform") + 1];
if (!/^linux\/(amd64|arm64)$/.test(platform ?? "")) {
  console.error("usage: pnpm verify:compat -- --platform linux/amd64|linux/arm64");
  process.exit(2);
}

const compose = ["compose", "--env-file", ".env.local", "-f", "infra/compose/docker-compose.yml"];
const run = (command, commandArgs, env = process.env) => {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    env,
  });
  return result.status ?? 1;
};

const image = process.env.STOCKQUANT_COMPAT_IMAGE ?? `stockquant-compat-platform-api:${platform.replaceAll("/", "-")}`;
if (!/^[a-z0-9][a-z0-9._/-]*:[a-z0-9][a-z0-9._-]*$/i.test(image)) {
  console.error("STOCKQUANT_COMPAT_IMAGE must be a tagged Docker image reference");
  process.exit(2);
}
const expectedArch = platform === "linux/amd64" ? "x64" : "arm64";
const architectureEmulatedAgainstHostProcess = process.arch !== expectedArch;
const probe = `if (process.platform !== 'linux' || process.arch !== '${expectedArch}' || !process.version.startsWith('v24.')) process.exit(1); console.log(JSON.stringify({ platform: process.platform, arch: process.arch, node: process.version }))`;
const composeValidationEnv = { ...process.env };
delete composeValidationEnv.DOCKER_DEFAULT_PLATFORM;
const checks = [
  ["compose-config", ["docker", [...compose, "config", "--quiet"], composeValidationEnv]],
  ["build-platform-api", ["docker", ["buildx", "build", "--load", "--platform", platform, "--tag", image, "--file", "services/platform-api-service/Dockerfile", "."]]],
  ["run-node-probe", ["docker", ["run", "--rm", "--platform", platform, image, "node", "-e", probe]]],
];

for (const [name, [command, commandArgs, env]] of checks) {
  const exitCode = run(command, commandArgs, env ?? process.env);
  if (exitCode !== 0) {
    console.error(`compatibility check failed: ${name}`);
    process.exit(exitCode);
  }
}

console.log(JSON.stringify({ status: "PASS", platform, hostProcess: `${process.platform}/${process.arch}`, architectureEmulatedAgainstHostProcess, architectureEvidence: "containerized platform-api-service probe", image }, null, 2));
