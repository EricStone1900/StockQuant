import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const inputRoot = resolve(root, "services/research-automation-service/runner/smoke");
const imageRef = process.env.STOCKQUANT_RUNNER_IMAGE_REF
  ?? "stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593";
const expectedImageId = process.env.STOCKQUANT_RUNNER_IMAGE_ID
  ?? "sha256:9752c80d5b7a40d6f327888b5d9bca06c0996a1ce7507ce99410b138fe0f169e";
const outputRoot = mkdtempSync(join(tmpdir(), "stockquant-v31-runner-output-"));

const args = [
  "run", "--rm", "--pull", "never", "--platform", "linux/amd64", "--network", "none", "--read-only",
  "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "128",
  "--cpus", "2", "--memory", "2g", "--user", "10001:10001",
  "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
  "--mount", `type=bind,src=${inputRoot},dst=/run/input,readonly=true`,
  "--mount", `type=bind,src=${outputRoot},dst=/run/output,readonly=false`,
  "--env", "STOCKQUANT_RUNNER_JOB=/run/input/job.json",
  imageRef,
];

try {
  const inspect = spawnSync("docker", ["image", "inspect", imageRef, "--format", "{{.Id}}"], {
    cwd: root,
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" },
  });
  if (inspect.status !== 0 || inspect.stdout.trim() !== expectedImageId) {
    throw new Error(`local image ID mismatch: expected ${expectedImageId}, got ${inspect.stdout.trim()}`);
  }
  const result = spawnSync("docker", args, {
    cwd: root,
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`docker runner exited ${result.status}: ${result.stderr}`);
  const envelope = JSON.parse(result.stdout.trim());
  const output = JSON.parse(readFileSync(join(outputRoot, "smoke.json"), "utf8"));
  if (envelope.status !== "COMPLETED" || envelope.exit_code !== 0) throw new Error("runner did not complete successfully");
  if (output.qlib !== "0.9.6.99") throw new Error(`unexpected qlib version: ${output.qlib}`);
  console.log(JSON.stringify({ status: "PASS", imageRef, envelope, output }, null, 2));
} finally {
  rmSync(outputRoot, { recursive: true, force: true });
}
