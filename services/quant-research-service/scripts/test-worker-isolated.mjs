import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const serviceDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDirectory = resolve(serviceDirectory, "../..");
const image = "python@sha256:e41613d42d4891e4930f79523f93f81bbc7632584ec65e36ab055f41a800b41e";
const platformByArchitecture = { arm64: "linux/arm64", x64: "linux/amd64" };
const platform = platformByArchitecture[process.arch];

function failPrerequisite(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

if (!platform) failPrerequisite(`Python Worker tests do not support host architecture ${process.arch}`);

const imageCheck = spawnSync("docker", ["image", "inspect", image], { stdio: "ignore" });
if (imageCheck.error?.code === "ENOENT") failPrerequisite("Docker is required to run Quant Research Python tests in the isolated Linux environment");
if (imageCheck.status !== 0) failPrerequisite(`Required Python test image is unavailable locally: ${image}; pull it through the approved image workflow before running tests`);

const result = spawnSync("docker", [
  "run", "--rm", "--network", "none", "--read-only",
  "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
  "--mount", `type=bind,src=${repositoryDirectory},dst=${repositoryDirectory},readonly`,
  "--workdir", serviceDirectory,
  "--platform", platform,
  image,
  "python3", "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"
], { stdio: "inherit" });

if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
