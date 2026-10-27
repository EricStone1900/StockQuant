import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serviceDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(serviceDir, "../..");
const tag = `stockquant-qlib-worker-smoke:${randomUUID()}`;
const smoke = resolve(serviceDir, "scripts/qlib-fit-container-smoke.py");
const fixture = resolve(root, "fixtures/v2/v2.3/qlib-fit/qlib-fit-input.json");
const quantToken = randomBytes(48).toString("base64url");
let imageCreated = false;
try {
  execFileSync("docker", ["build", "--platform", "linux/amd64", "--tag", tag, "--file", resolve(serviceDir, "qlib-worker.Dockerfile"), serviceDir], { cwd: root, stdio: "inherit" });
  imageCreated = true;
  const imageId = execFileSync("docker", ["image", "inspect", "--format", "{{.Id}}", tag], { encoding: "utf8" }).trim();
  process.stdout.write(JSON.stringify({ event: "temporary_qlib_image_built", imageId, platform: "linux/amd64" }) + "\n");
  execFileSync("docker", [
    "run", "--rm", "--platform", "linux/amd64", "--network", "none", "--memory", "2g", "--cpus", "1", "--pids-limit", "128", "--read-only",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=256m", "--volume", `${smoke}:/opt/qlib/qlib-fit-container-smoke.py:ro`, "--volume", `${fixture}:/opt/qlib/qlib-fit-input.json:ro`, "-e", "HOME=/tmp", "-e", `STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE=${quantToken}`, tag,
    "python", "/opt/qlib/qlib-fit-container-smoke.py",
  ], { cwd: root, stdio: "inherit" });
} finally {
  if (imageCreated) execFileSync("docker", ["image", "rm", "--force", tag], { cwd: root, stdio: "inherit" });
}
