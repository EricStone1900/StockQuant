import { createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { closeSync, constants, lstatSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import type { RunnerExecutionResult } from "./v31-runner-executor.js";
import { executeRunnerPlan } from "./v31-runner-executor.js";
import type { RunnerLaunchPlan } from "./v31-runner-launch.js";

type DockerCommandResult = { exitCode: number | null; stderr: string; stdout: string };
type DockerCommand = (args: string[], signal?: AbortSignal) => Promise<DockerCommandResult>;
const DOCKER_COMMAND_TIMEOUT_MS = 60_000;
const MAX_EXTRACTED_JSON_BYTES = 44 * 1024 * 1024;
const OUTPUT_EXTRACTOR = String.raw`import base64,json,os,re,stat,sys
root='/run/output'; safe=re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'); files=[]; total=0
def walk(directory,parts,depth):
 global total
 if depth>16: raise ValueError('output depth exceeds limit')
 for name in sorted(os.listdir(directory)):
  if not parts and name=='checkpoint.json': continue
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

async function runDockerCommand(args: string[], signal?: AbortSignal): Promise<DockerCommandResult> {
  return new Promise((resolve) => {
    let child: ChildProcess;
    try { child = spawn("docker", args, { env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" }, detached: true, stdio: ["ignore", "pipe", "pipe"] }); }
    catch (error) { resolve({ exitCode: null, stderr: String(error), stdout: "" }); return; }
    let settled = false;
    let stderr = "";
    let stdoutBytes = 0;
    const stdoutChunks: Buffer[] = [];
    let outputLimit = false;
    const finish = (result: DockerCommandResult) => { if (!settled) { settled = true; clearTimeout(timer); signal?.removeEventListener("abort", abort); resolve(result); } };
    child.stderr?.on("data", (chunk) => { if (Buffer.byteLength(stderr) < 64 * 1024) stderr += chunk.toString().slice(0, 64 * 1024 - Buffer.byteLength(stderr)); });
    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > MAX_EXTRACTED_JSON_BYTES) { outputLimit = true; kill(); return; }
      stdoutChunks.push(Buffer.from(chunk));
    });
    const kill = () => { try { if (child.pid) process.kill(-child.pid, "SIGKILL"); else child.kill("SIGKILL"); } catch { /* process already exited */ } };
    const abort = () => { kill(); finish({ exitCode: null, stderr: "Docker command aborted", stdout: "" }); };
    const timer = setTimeout(() => {
      kill();
      finish({ exitCode: null, stderr: `${stderr}Docker command timed out`, stdout: "" });
    }, DOCKER_COMMAND_TIMEOUT_MS);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    child.once("error", (error) => finish({ exitCode: null, stderr: String(error), stdout: "" }));
    child.once("close", (exitCode) => finish({ exitCode: outputLimit ? null : exitCode, stderr: outputLimit ? `${stderr}Docker output limit exceeded` : stderr, stdout: outputLimit ? "" : Buffer.concat(stdoutChunks).toString("utf8") }));
  });
}

function materializeExtractedOutput(content: string, outputRoot: string): void {
  if (Buffer.byteLength(content) > MAX_EXTRACTED_JSON_BYTES || !isAbsolute(outputRoot)) throw new Error("extracted Runner output exceeds the host transfer limit");
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new Error("Runner output transfer is not valid JSON"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).join(",") !== "files" || !Array.isArray((parsed as { files?: unknown }).files)) throw new Error("Runner output transfer schema is invalid");
  const files = (parsed as { files: unknown[] }).files;
  if (files.length > 64) throw new Error("Runner output transfer exceeds the 64-file limit");
  const root = resolve(outputRoot);
  let total = 0;
  const safeSegment = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
  for (const candidate of files) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error("Runner output file entry is invalid");
    const file = candidate as Record<string, unknown>;
    if (Object.keys(file).sort().join(",") !== "contentBase64,path" || typeof file.path !== "string" || typeof file.contentBase64 !== "string") throw new Error("Runner output file entry is invalid");
    const parts = file.path.split("/");
    if (parts.length < 1 || parts.length > 17 || parts.some((part) => !safeSegment.test(part))) throw new Error("Runner output path contains an unsafe segment");
    const bytes = Buffer.from(file.contentBase64, "base64");
    if (bytes.toString("base64") !== file.contentBase64 || bytes.byteLength > 8 * 1024 * 1024) throw new Error("Runner output content encoding or file size is invalid");
    total += bytes.byteLength;
    if (total > 32 * 1024 * 1024) throw new Error("Runner output transfer exceeds the 32 MiB total limit");
    const target = resolve(root, ...parts);
    const rel = relative(root, target);
    if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("Runner output path escapes the managed root");
    const parent = dirname(target);
    mkdirSyncSafe(parent, root);
    const fd = requireOpenExclusive(target);
    try { writeFileSyncFd(fd, bytes); } finally { closeFd(fd); }
  }
}

function mkdirSyncSafe(directory: string, root: string): void {
  const rel = relative(root, directory);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Runner output directory escapes the managed root");
  let current = root;
  for (const part of rel ? rel.split(sep) : []) {
    current = resolve(current, part);
    try { mkdirSync(current, { mode: 0o700 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    const info = lstatSync(current);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Runner output target parent is not a regular directory");
  }
}
function requireOpenExclusive(path: string): number { return openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600); }
function writeFileSyncFd(fd: number, bytes: Uint8Array): void { let offset = 0; while (offset < bytes.byteLength) offset += writeSync(fd, bytes, offset, bytes.byteLength - offset); }
function closeFd(fd: number): void { closeSync(fd); }

export type RunnerContainerExecutorOptions = {
  signal?: AbortSignal;
  executePlan?: typeof executeRunnerPlan;
  dockerCommand?: DockerCommand;
  readCheckpoint?: (containerName: string, signal?: AbortSignal) => Promise<Uint8Array | null>;
  onCheckpoint?: (content: Uint8Array) => Promise<void>;
  checkpointPollIntervalMs?: number;
};

const CHECKPOINT_EXTRACTOR = String.raw`import base64,json,os,stat,sys
path='/run/output/checkpoint.json'
try: fd=os.open(path,os.O_RDONLY|getattr(os,'O_NOFOLLOW',0))
except FileNotFoundError: sys.stdout.write('{"status":"EMPTY"}'); sys.exit(0)
before=os.fstat(fd)
if not stat.S_ISREG(before.st_mode) or before.st_nlink!=1 or before.st_size>256*1024: raise ValueError('checkpoint must be a regular file no larger than 256 KiB')
with os.fdopen(fd,'rb') as stream: data=stream.read(256*1024+1); after=os.fstat(stream.fileno())
if len(data)!=before.st_size or before.st_ino!=after.st_ino or before.st_size!=after.st_size or before.st_mtime_ns!=after.st_mtime_ns: raise ValueError('checkpoint changed during read')
json.loads(data.decode('utf-8'))
sys.stdout.write(json.dumps({'status':'FOUND','contentBase64':base64.b64encode(data).decode('ascii')},separators=(',',':')))`;

async function readCheckpointFromContainer(containerName: string, dockerCommand: DockerCommand, signal?: AbortSignal): Promise<Uint8Array | null> {
  const result = await dockerCommand(["exec", containerName, "python", "-c", CHECKPOINT_EXTRACTOR], signal);
  if (result.exitCode !== 0) throw new Error(`Runner checkpoint extraction failed: ${result.stderr}`);
  let body: unknown;
  try { body = JSON.parse(result.stdout); } catch { throw new Error("Runner checkpoint extraction returned invalid JSON"); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Runner checkpoint extraction response is invalid");
  const record = body as Record<string, unknown>;
  if (record.status === "EMPTY" && Object.keys(record).length === 1) return null;
  if (record.status !== "FOUND" || typeof record.contentBase64 !== "string" || Object.keys(record).sort().join(",") !== "contentBase64,status") throw new Error("Runner checkpoint extraction response does not match its schema");
  const bytes = Buffer.from(record.contentBase64, "base64");
  if (bytes.byteLength > 256 * 1024 || bytes.toString("base64") !== record.contentBase64) throw new Error("Runner checkpoint extraction exceeded the 256 KiB limit or used invalid base64");
  return bytes;
}

function startCheckpointMonitor(input: {
  containerName: string;
  signal?: AbortSignal;
  read: (containerName: string, signal?: AbortSignal) => Promise<Uint8Array | null>;
  onCheckpoint: (content: Uint8Array) => Promise<void>;
  pollIntervalMs: number;
}): { stop(): Promise<void> } {
  let stopped = false;
  let failure: unknown;
  let lastCheckpointHash: string | null = null;
  const loop = (async () => {
    while (!stopped && !input.signal?.aborted) {
      try {
        const content = await input.read(input.containerName, input.signal);
        if (content) {
          const checkpointHash = createHash("sha256").update(content).digest("hex");
          if (checkpointHash !== lastCheckpointHash) {
            await input.onCheckpoint(content);
            lastCheckpointHash = checkpointHash;
          }
        }
      } catch (error) {
        if (!input.signal?.aborted) { failure = error; stopped = true; }
      }
      if (!stopped && !input.signal?.aborted) await new Promise((resolve) => setTimeout(resolve, input.pollIntervalMs));
    }
  })();
  return { async stop() { stopped = true; await loop; if (failure) throw failure; } };
}

function resultFromContainerEnvelope(raw: RunnerExecutionResult, marker: string): RunnerExecutionResult {
  const markerAt = raw.stdout.lastIndexOf(marker);
  if (markerAt < 0) return raw;
  const suffix = raw.stdout.slice(markerAt + marker.length).split(/\r?\n/u, 1)[0];
  if (!/^-?\d+$/u.test(suffix)) return { ...raw, status: "FAILED", stderr: `${raw.stderr}Runner emitted an invalid completion marker` };
  const lines = raw.stdout.slice(0, markerAt).trimEnd().split(/\r?\n/u);
  let envelope: Record<string, unknown> | undefined;
  for (let index = lines.length - 1; index >= 0 && !envelope; index -= 1) {
    try {
      const parsed: unknown = JSON.parse(lines[index]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) envelope = parsed as Record<string, unknown>;
    } catch { /* preceding lines may be untrusted experiment output */ }
  }
  const exitCode = Number(suffix);
  if (!envelope || !Number.isInteger(exitCode) || exitCode < -255 || exitCode > 255) return { ...raw, status: "FAILED", stderr: `${raw.stderr}Runner completion envelope is missing or invalid` };
  const runnerTimedOut = envelope.status === "REJECTED" && envelope.reason === "runner timeout";
  const success = envelope.status === "COMPLETED" && envelope.exit_code === 0 && exitCode === 0;
  return { ...raw, status: success ? "COMPLETED" : runnerTimedOut ? "TIMED_OUT" : "FAILED", exitCode, signal: null, stdout: lines.slice(0, -1).join("\n") };
}

/** Run a named container, extract its 32 MiB-capped tmpfs outputs while alive, then force-remove it. */
export async function executeRunnerContainer(plan: RunnerLaunchPlan, options: RunnerContainerExecutorOptions = {}): Promise<RunnerExecutionResult> {
  const execute = options.executePlan ?? executeRunnerPlan;
  const dockerCommand = options.dockerCommand ?? runDockerCommand;
  const readCheckpoint = options.readCheckpoint ?? ((containerName, signal) => readCheckpointFromContainer(containerName, dockerCommand, signal));
  const checkpointPollIntervalMs = options.checkpointPollIntervalMs ?? 500;
  if (!Number.isSafeInteger(checkpointPollIntervalMs) || checkpointPollIntervalMs < 1 || checkpointPollIntervalMs > 10_000) throw new Error("Runner checkpoint poll interval must be from 1 through 10000 milliseconds");
  let result: RunnerExecutionResult = { status: "SPAWN_FAILED", exitCode: null, signal: null, stdout: "", stderr: "container startup did not complete", durationMs: 0 };
  let containerStarted = false;
  let checkpointMonitor: ReturnType<typeof startCheckpointMonitor> | null = null;
  if (plan.previousContainerName) {
    const stale = await dockerCommand(["rm", "--force", plan.previousContainerName]);
    if (stale.exitCode !== 0 && !/No such container/iu.test(stale.stderr)) throw new Error(`previous Runner fence cleanup failed; refusing new execution: ${stale.stderr}`);
  }
  try {
    const launched = await execute(plan, { signal: options.signal, maxOutputBytes: 64 * 1024 });
    if (launched.status !== "COMPLETED" || launched.exitCode !== 0) result = launched;
    else {
      containerStarted = true;
      if (options.onCheckpoint) checkpointMonitor = startCheckpointMonitor({ containerName: plan.containerName, signal: options.signal, read: readCheckpoint, onCheckpoint: options.onCheckpoint, pollIntervalMs: checkpointPollIntervalMs });
      const followed = await execute({ ...plan, argv: ["logs", "--follow", plan.containerName] }, { signal: options.signal, completionMarker: plan.completionMarker });
      await checkpointMonitor?.stop();
      checkpointMonitor = null;
      result = resultFromContainerEnvelope(followed, plan.completionMarker);
    }
    if (result.status === "COMPLETED" && !options.signal?.aborted) {
      const extracted = await dockerCommand(["exec", plan.containerName, "python", "-c", OUTPUT_EXTRACTOR], options.signal);
      if (extracted.exitCode !== 0) result = { ...result, status: "FAILED", stderr: `${result.stderr}${extracted.stderr}` };
      else materializeExtractedOutput(extracted.stdout, plan.outputRoot);
    }
  } catch (error) {
    await checkpointMonitor?.stop().catch(() => undefined);
    result = { status: containerStarted ? "FAILED" : "SPAWN_FAILED", exitCode: null, signal: null, stdout: "", stderr: String(error), durationMs: 0 };
  }

  const removed = await dockerCommand(["rm", "--force", plan.containerName]).catch((error) => ({ exitCode: null, stderr: String(error) }));
  if (removed.exitCode !== 0 && !/No such container/iu.test(removed.stderr)) throw new Error(`Runner container cleanup failed; refusing job completion: ${removed.stderr}`);
  if (options.signal?.aborted) throw options.signal.reason ?? new Error("Runner lease was lost; execution aborted");
  return result;
}
