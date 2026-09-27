import { chmodSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const root = resolve(new URL("..", import.meta.url).pathname);
const imageRef = process.env.STOCKQUANT_RUNNER_IMAGE_REF ?? "stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593";
const expectedImageId = process.env.STOCKQUANT_RUNNER_IMAGE_ID ?? "sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb";
const marker = "__STOCKQUANT_RUNNER_RESULT__:";
const maxLogBytes = 8 * 1024 * 1024;
const temporaryRoots = [];
const dockerEnv = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" };
const outputExtractor = String.raw`import base64,json,os,re,stat,sys
root='/run/output'; safe=re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'); files=[]; total=0
def walk(directory,parts,depth):
 global total
 if depth>16: raise ValueError('output depth exceeds limit')
 for name in sorted(os.listdir(directory)):
  if not safe.fullmatch(name): raise ValueError('unsafe output path segment')
  path=os.path.join(directory,name); rel='/'.join(parts+[name]); before=os.lstat(path)
  if stat.S_ISLNK(before.st_mode): raise ValueError('output symlinks are forbidden')
  if stat.S_ISDIR(before.st_mode): walk(path,parts+[name],depth+1); continue
  if not stat.S_ISREG(before.st_mode) or before.st_nlink!=1: raise ValueError('output must be a regular file without hard links')
  if before.st_size>8*1024*1024 or len(files)>=64: raise ValueError('output file/count limit exceeded')
  total+=before.st_size
  if total>32*1024*1024: raise ValueError('output total size limit exceeded')
  fd=os.open(path,os.O_RDONLY|getattr(os,'O_NOFOLLOW',0)); opened=os.fstat(fd)
  with os.fdopen(fd,'rb') as stream: data=stream.read(8*1024*1024+1); after=os.fstat(stream.fileno())
  if opened.st_ino!=after.st_ino or opened.st_size!=after.st_size or opened.st_mtime_ns!=after.st_mtime_ns or len(data)!=opened.st_size: raise ValueError('output changed during read')
  files.append({'path':rel,'contentBase64':base64.b64encode(data).decode('ascii')})
walk(root,[],0); sys.stdout.write(json.dumps({'files':files},separators=(',',':')))`;

function syncDocker(args, maxBuffer = 128 * 1024) {
  const result = spawnSync("docker", args, { cwd: root, encoding: "utf8", env: dockerEnv, timeout: 60_000, maxBuffer });
  if (result.error) throw result.error;
  return result;
}

const inspect = syncDocker(["image", "inspect", imageRef, "--format", "{{.Id}}"]);
if (inspect.status !== 0 || inspect.stdout.trim() !== expectedImageId) throw new Error(`local image ID mismatch: expected ${expectedImageId}, got ${inspect.stdout.trim()}`);

function runContainer(name, inputRoot, { hostTimeoutMs = 15_000, memory = "2g" } = {}) {
  const containerName = `sqrunner-smoke-${randomUUID().replaceAll("-", "").slice(0, 24)}`;
  const args = [
    "run", "--detach", "--name", containerName, "--pull", "never", "--platform", "linux/amd64", "--network", "none", "--read-only",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "128", "--cpus", "2", "--memory", memory,
    "--user", "10001:10001", "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "--tmpfs", "/run/output:rw,noexec,nosuid,size=32m",
    "--mount", `type=bind,src=${inputRoot},dst=/run/input,readonly=true`,
    "--env", "STOCKQUANT_RUNNER_JOB=/run/input/job.json", "--entrypoint", "/bin/sh", imageRef,
    "-c", 'python /opt/stockquant/runner.py; result=$?; printf "\\n__STOCKQUANT_RUNNER_RESULT__:%s\\n" "$result"; sleep 120; exit "$result"',
  ];
  const started = spawnSync("docker", args, { cwd: root, encoding: "utf8", env: dockerEnv, timeout: 15_000, maxBuffer: 64 * 1024 });
  if (started.status !== 0) throw new Error(`docker run failed: ${started.stderr}`);
  const child = spawn("docker", ["logs", "--follow", containerName], { cwd: root, env: dockerEnv, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = ""; let stderr = ""; let logBytes = 0; let hostTimedOut = false; let outputLimit = false; let settled = false;
  return new Promise((resolveRun, rejectRun) => {
    const stopCli = () => { try { if (child.pid) process.kill(-child.pid, "SIGKILL"); } catch { /* already exited */ } };
    const timer = setTimeout(() => { hostTimedOut = true; stopCli(); }, hostTimeoutMs);
    const onData = (target) => (chunk) => {
      const value = chunk.toString(); logBytes += Buffer.byteLength(value);
      if (logBytes > maxLogBytes) { outputLimit = true; stopCli(); return; }
      if (target === "stdout") stdout += value; else stderr += value;
      if (target === "stdout" && stdout.includes(marker)) stopCli();
    };
    child.stdout.on("data", onData("stdout")); child.stderr.on("data", onData("stderr"));
    const settle = (error, close) => {
      if (settled) return; settled = true; clearTimeout(timer);
      if (error) rejectRun(error); else resolveRun({ containerName, stdout, stderr, close, hostTimedOut, outputLimit, reachedMarker: stdout.includes(marker), executionName: name });
    };
    child.once("error", (error) => settle(error));
    child.once("close", (code, signal) => settle(null, { code, signal }));
  });
}

function decodeEnvelope(stdout) {
  const markerAt = stdout.lastIndexOf(marker);
  if (markerAt < 0) throw new Error("trusted completion marker was not observed");
  const exitText = stdout.slice(markerAt + marker.length).split(/\r?\n/u, 1)[0];
  if (!/^-?\d+$/u.test(exitText)) throw new Error("completion marker exit code is invalid");
  const lines = stdout.slice(0, markerAt).trimEnd().split(/\r?\n/u);
  let envelope;
  for (let index = lines.length - 1; index >= 0 && !envelope; index -= 1) {
    try { envelope = JSON.parse(lines[index]); } catch { /* untrusted user output */ }
  }
  if (!envelope || typeof envelope !== "object") throw new Error("Runner result envelope is missing");
  return { exitCode: Number(exitText), envelope };
}

function removeContainer(name) {
  const removed = syncDocker(["rm", "--force", name]);
  if (removed.status !== 0 && !removed.stderr.includes("No such container")) throw new Error(`daemon cleanup failed: ${removed.stderr}`);
}

async function normalCase() {
  const inputRoot = resolve(root, "services/research-automation-service/runner/smoke");
  const outputRoot = mkdtempSync(join(tmpdir(), "stockquant-v31-runner-output-")); temporaryRoots.push(outputRoot);
  const task = await runContainer("normal", inputRoot);
  try {
    if (!task.reachedMarker || task.hostTimedOut || task.outputLimit) throw new Error(`normal task did not finish cleanly: ${task.stderr}`);
    const { exitCode, envelope } = decodeEnvelope(task.stdout);
    if (exitCode !== 0 || envelope.status !== "COMPLETED" || envelope.exit_code !== 0) throw new Error("normal task returned an unexpected Runner envelope");
    const copied = syncDocker(["exec", task.containerName, "python", "-c", outputExtractor], 48 * 1024 * 1024);
    if (copied.status !== 0) throw new Error(`bounded output extraction failed: ${copied.stderr}`);
    const transfer = JSON.parse(copied.stdout);
    if (!transfer || !Array.isArray(transfer.files) || transfer.files.length > 64) throw new Error("output transfer schema or file count is invalid");
    let total = 0;
    for (const file of transfer.files) {
      const parts = file.path.split("/");
      if (!parts.length || parts.length > 17 || parts.some((part) => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(part))) throw new Error("output transfer path is unsafe");
      const bytes = Buffer.from(file.contentBase64, "base64"); total += bytes.length;
      if (bytes.toString("base64") !== file.contentBase64 || bytes.length > 8 * 1024 * 1024 || total > 32 * 1024 * 1024) throw new Error("output transfer limits or encoding are invalid");
      const target = join(outputRoot, ...parts); mkdirSync(join(target, ".."), { recursive: true }); writeFileSync(target, bytes, { flag: "wx", mode: 0o600 });
    }
    const output = JSON.parse(readFileSync(join(outputRoot, "smoke.json"), "utf8"));
    if (output.qlib !== "0.9.6.99") throw new Error(`unexpected qlib version: ${output.qlib}`);
    return { name: "normal-output-copy", status: "PASS", containerName: task.containerName };
  } finally { removeContainer(task.containerName); }
}

async function filesystemIsolationCase() {
  const inputRoot = mkdtempSync(join(tmpdir(), "stockquant-v31-runner-fs-input-")); temporaryRoots.push(inputRoot);
  mkdirSync(join(inputRoot, "code"));
  writeFileSync(join(inputRoot, "job.json"), JSON.stringify({ artifact_namespace: "v31/smoke", network_policy: "DENY", script: "isolation.py", timeout_seconds: 30 }));
  writeFileSync(join(inputRoot, "code/isolation.py"), String.raw`import json
from pathlib import Path

def mount_options(target):
    for line in Path('/proc/mounts').read_text().splitlines():
        fields = line.split()
        if len(fields) >= 4 and fields[1] == target:
            return set(fields[3].split(','))
    raise RuntimeError('mount not found: ' + target)

root_ro = 'ro' in mount_options('/')
input_ro = 'ro' in mount_options('/run/input')
output_rw = 'rw' in mount_options('/run/output')
input_write_blocked = False
try:
    Path('/run/input/code/main.py').write_text('tampered')
except OSError:
    input_write_blocked = True
Path('/tmp/stockquant-writable-tmp-probe').write_text('tmpfs')
Path('/run/output/isolation.json').write_text(json.dumps({
    'rootReadOnly': root_ro,
    'inputReadOnly': input_ro,
    'inputWriteBlocked': input_write_blocked,
    'outputWritable': output_rw,
    'tmpWritable': True
}, sort_keys=True))
if not (root_ro and input_ro and input_write_blocked and output_rw):
    raise RuntimeError('container filesystem isolation assertion failed')
print('filesystem isolation verified')
`);
  chmodSync(inputRoot, 0o755);
  chmodSync(join(inputRoot, "code"), 0o755);
  chmodSync(join(inputRoot, "job.json"), 0o644);
  chmodSync(join(inputRoot, "code/isolation.py"), 0o644);
  const task = await runContainer("filesystem-isolation", inputRoot);
  try {
    if (!task.reachedMarker || task.hostTimedOut || task.outputLimit) throw new Error(`filesystem isolation task did not finish: ${task.stderr}`);
    const { exitCode, envelope } = decodeEnvelope(task.stdout);
    if (exitCode !== 0 || envelope.status !== "COMPLETED" || envelope.exit_code !== 0) throw new Error("filesystem isolation Runner result mismatch");
    const copied = syncDocker(["exec", task.containerName, "python", "-c", outputExtractor], 48 * 1024 * 1024);
    if (copied.status !== 0) throw new Error(`filesystem isolation output extraction failed: ${copied.stderr}`);
    const result = JSON.parse(Buffer.from(JSON.parse(copied.stdout).files.find((file) => file.path === "isolation.json").contentBase64, "base64").toString("utf8"));
    if (!result.rootReadOnly || !result.inputReadOnly || !result.inputWriteBlocked || !result.outputWritable || !result.tmpWritable) throw new Error(`filesystem isolation evidence mismatch: ${JSON.stringify(result)}`);
    return { name: "read-only-root-input-and-isolated-writable-output", status: "PASS", containerName: task.containerName, assertions: result };
  } finally { removeContainer(task.containerName); }
}

async function fixedFailureCase(name, inputRoot, expected, options = {}) {
  const task = await runContainer(name, inputRoot, options);
  try {
    if (!task.reachedMarker || task.hostTimedOut || task.outputLimit) throw new Error(`${name} task did not reach its trusted completion marker`);
    const { exitCode, envelope } = decodeEnvelope(task.stdout);
    expected(exitCode, envelope);
    return { name, status: "PASS", containerName: task.containerName };
  } finally { removeContainer(task.containerName); }
}

async function hostTimeoutCase() {
  const inputRoot = mkdtempSync(join(tmpdir(), "stockquant-v31-runner-hang-input-")); temporaryRoots.push(inputRoot);
  mkdirSync(join(inputRoot, "code"));
  writeFileSync(join(inputRoot, "job.json"), JSON.stringify({ artifact_namespace: "v31/smoke", network_policy: "DENY", script: "hang.py", timeout_seconds: 3600 }));
  writeFileSync(join(inputRoot, "code/hang.py"), "import time\nwhile True: time.sleep(1)\n");
  const task = await runContainer("host-timeout", inputRoot, { hostTimeoutMs: 3000 });
  if (!task.hostTimedOut || task.reachedMarker) throw new Error("host timeout scenario did not interrupt the local Docker client");
  removeContainer(task.containerName);
  const after = syncDocker(["inspect", task.containerName]);
  if (after.status === 0) throw new Error("daemon container survived host timeout cleanup");
  return { name: "host-timeout-daemon-cleanup", status: "PASS", containerName: task.containerName };
}

try {
  const results = [
    await normalCase(),
    await fixedFailureCase("runner-timeout", resolve(root, "services/research-automation-service/runner/smoke/timeout"), (code, env) => { if (code !== 2 || env.status !== "REJECTED" || env.reason !== "runner timeout") throw new Error("Runner timeout rejection mismatch"); }),
    await fixedFailureCase("path-rejection", resolve(root, "services/research-automation-service/runner/smoke/path"), (code, env) => { if (code !== 2 || env.status !== "REJECTED" || !env.reason.includes("under /run/input/code")) throw new Error("path rejection mismatch"); }),
    await fixedFailureCase("oom", resolve(root, "services/research-automation-service/runner/smoke/oom"), (code, env) => { if (code !== 247 || env.status !== "FAILED" || env.exit_code !== -9) throw new Error(`OOM result mismatch: ${JSON.stringify({ code, env })}`); }, { memory: "128m" }),
    await filesystemIsolationCase(),
    await hostTimeoutCase(),
  ];
  console.log(JSON.stringify({ status: "PASS", imageRef, expectedImageId, emulation: "linux/amd64 on macOS arm64", results }, null, 2));
} finally {
  for (const path of temporaryRoots) rmSync(path, { recursive: true, force: true });
}
