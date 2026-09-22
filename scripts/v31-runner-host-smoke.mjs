import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const inputRoot = resolve(root, "services/research-automation-service/runner/smoke");
const imageRef = process.env.STOCKQUANT_RUNNER_IMAGE_REF
  ?? "stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593";
const expectedImageId = process.env.STOCKQUANT_RUNNER_IMAGE_ID
  ?? "sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb";
const inspect = spawnSync("docker", ["image", "inspect", imageRef, "--format", "{{.Id}}"], {
  cwd: root,
  encoding: "utf8",
  env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" },
});
if (inspect.status !== 0 || inspect.stdout.trim() !== expectedImageId) {
  throw new Error(`local image ID mismatch: expected ${expectedImageId}, got ${inspect.stdout.trim()}`);
}

function runCase(name, caseInputRoot, expectedExit, assertion, memory = "2g") {
  const outputRoot = mkdtempSync(join(tmpdir(), `stockquant-v31-runner-${name}-`));
  const args = [
    "run", "--rm", "--pull", "never", "--platform", "linux/amd64", "--network", "none", "--read-only",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "128",
    "--cpus", "2", "--memory", memory, "--user", "10001:10001",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
    "--mount", `type=bind,src=${caseInputRoot},dst=/run/input,readonly=true`,
    "--mount", `type=bind,src=${outputRoot},dst=/run/output,readonly=false`,
    "--env", "STOCKQUANT_RUNNER_JOB=/run/input/job.json",
    imageRef,
  ];
  try {
    const result = spawnSync("docker", args, {
      cwd: root,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" },
    });
    if (result.error) throw result.error;
    const allowedExitCodes = Array.isArray(expectedExit) ? expectedExit : [expectedExit];
    if (!allowedExitCodes.includes(result.status)) throw new Error(`${name}: expected exit ${allowedExitCodes.join("/")}, got ${result.status}: ${result.stderr}`);
    assertion(result.stdout.trim(), outputRoot);
    return { name, exitCode: result.status };
  } finally {
    rmSync(outputRoot, { recursive: true, force: true });
  }
}

try {
  const results = [
    runCase("normal", inputRoot, 0, (stdout, outputRoot) => {
      const envelope = JSON.parse(stdout);
      const output = JSON.parse(readFileSync(join(outputRoot, "smoke.json"), "utf8"));
      if (envelope.status !== "COMPLETED" || envelope.exit_code !== 0) throw new Error("normal runner did not complete successfully");
      if (output.qlib !== "0.9.6.99") throw new Error(`unexpected qlib version: ${output.qlib}`);
    }),
    runCase("timeout", resolve(root, "services/research-automation-service/runner/smoke/timeout"), 2, (stdout) => {
      const envelope = JSON.parse(stdout);
      if (envelope.status !== "REJECTED" || envelope.reason !== "runner timeout") throw new Error("timeout was not rejected");
    }),
    runCase("path-rejection", resolve(root, "services/research-automation-service/runner/smoke/path"), 2, (stdout) => {
      const envelope = JSON.parse(stdout);
      if (envelope.status !== "REJECTED" || !envelope.reason.includes("under /run/input/code")) throw new Error("path escape was not rejected");
    }),
    runCase("oom", resolve(root, "services/research-automation-service/runner/smoke/oom"), [137, 247], (stdout, outputRoot) => {
      const envelope = JSON.parse(stdout);
      if (envelope.status !== "FAILED" || envelope.exit_code !== -9 || readdirSync(outputRoot).length > 0) throw new Error("OOM was not recorded as a failed child process");
    }, "128m"),
  ];
  console.log(JSON.stringify({ status: "PASS", imageRef, results }, null, 2));
} finally {
  // Case-specific output directories are removed by runCase.
}
