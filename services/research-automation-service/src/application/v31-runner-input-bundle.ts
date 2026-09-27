import { mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { sha256, type RunnerJob, validateRunnerJob } from "./v31-runtime-guards.js";
import { parsePromotionDataSidecars } from "./v32-promotion-producer.js";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 256;
const MAX_EXPANDED_BYTES = 32 * 1024 * 1024;
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

export type RunnerInputBundle = {
  schemaVersion: "v3.1-runner-input-bundle-v1";
  script: string;
  files: Array<{ path: string; content: Uint8Array }>;
  runtimeJob: { artifact_namespace: string; network_policy: "DENY"; script: string; timeout_seconds: number };
  promotionData?: { dataManifest: Uint8Array; validationPlan: Uint8Array; dataFiles: Array<{ path: string; content: Uint8Array }> };
};

function safeBundlePath(path: unknown): path is string {
  if (typeof path !== "string" || path.length > 512 || isAbsolute(path) || path.includes("\\") || path.includes("\0")) return false;
  const parts = path.split("/");
  if (parts.length < 2 || !["code", "data"].includes(parts[0])) return false;
  return parts.every((part, index) => index === 0 ? SAFE_SEGMENT.test(part) : SAFE_SEGMENT.test(part));
}

/** Parse the content-addressed JSON input bundle without extracting archives. */
export function parseRunnerInputBundle(content: Uint8Array, job: RunnerJob): RunnerInputBundle {
  if (content.byteLength > MAX_INPUT_BYTES) throw new Error("runner input bundle exceeds 8 MiB limit");
  validateRunnerJob(job);
  if (sha256(content) !== job.inputArtifact.split("/").at(-1)) throw new Error("runner input bundle hash does not match the job inputArtifact");
  let value: unknown;
  try { value = JSON.parse(Buffer.from(content).toString("utf8")); }
  catch { throw new Error("runner input bundle must be valid JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("runner input bundle must be an object");
  const bundle = value as Record<string, unknown>;
  if (Object.keys(bundle).sort().join(",") !== "files,schemaVersion,script" || bundle.schemaVersion !== "v3.1-runner-input-bundle-v1") throw new Error("runner input bundle schema is invalid");
  if (typeof bundle.script !== "string" || !/^code\/(?:[A-Za-z0-9][A-Za-z0-9._-]{0,127}\/)*[A-Za-z0-9][A-Za-z0-9._-]{0,123}\.py$/u.test(bundle.script) || !safeBundlePath(bundle.script)) throw new Error("runner bundle script must be a safe Python path under code/");
  if (!Array.isArray(bundle.files) || bundle.files.length < 1 || bundle.files.length > MAX_FILES) throw new Error("runner input bundle must contain between 1 and 256 files");
  const seen = new Set<string>();
  let expandedBytes = 0;
  const files = bundle.files.map((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error("runner input bundle file entry is invalid");
    const file = candidate as Record<string, unknown>;
    if (Object.keys(file).sort().join(",") !== "contentBase64,path" || !safeBundlePath(file.path) || typeof file.contentBase64 !== "string") throw new Error("runner input bundle file entry is invalid");
    if (seen.has(file.path)) throw new Error("runner input bundle contains a duplicate path");
    seen.add(file.path);
    const bytes = Buffer.from(file.contentBase64, "base64");
    if (bytes.toString("base64") !== file.contentBase64) throw new Error("runner input bundle contentBase64 is invalid");
    expandedBytes += bytes.byteLength;
    if (expandedBytes > MAX_EXPANDED_BYTES) throw new Error("runner input bundle expanded content exceeds 32 MiB");
    return { path: file.path, content: bytes };
  });
  if (!seen.has(bundle.script)) throw new Error("runner input bundle script is missing from files");
  if (job.networkPolicy.mode !== "DENY") throw new Error("local Runner input bundle requires network policy DENY");
  const promotionData = parsePromotionDataSidecars({ files, testRunId: job.testRunId, experimentId: job.experimentId });
  return {
    schemaVersion: "v3.1-runner-input-bundle-v1",
    script: bundle.script,
    files,
    runtimeJob: { artifact_namespace: `v31/${job.testRunId}/${job.experimentId}`, network_policy: "DENY", script: bundle.script.slice("code/".length), timeout_seconds: job.resources.timeoutSeconds },
    ...(promotionData ? { promotionData } : {}),
  };
}

/** Materialize only a parsed bundle into a new, exact job input directory. */
export async function materializeRunnerInputBundle(bundle: RunnerInputBundle, inputRoot: string): Promise<void> {
  if (!isAbsolute(inputRoot) || inputRoot.includes(",") || inputRoot.includes("\0") || inputRoot.split(/[\\/]+/u).includes("..")) throw new Error("runner input directory must be absolute and traversal-free");
  await mkdir(inputRoot, { recursive: false, mode: 0o755 });
  try {
    const root = await realpath(inputRoot);
    for (const file of bundle.files) {
      if (!safeBundlePath(file.path)) throw new Error("runner input bundle contains an unsafe materialized path");
      const target = resolve(root, ...file.path.split("/"));
      const rel = relative(root, target);
      if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("runner input file escapes its isolated root");
      await mkdir(dirname(target), { recursive: true, mode: 0o755 });
      await writeFile(target, file.content, { flag: "wx", mode: 0o644 });
    }
    await writeFile(resolve(root, "job.json"), JSON.stringify(bundle.runtimeJob), { flag: "wx", mode: 0o644 });
  } catch (error) {
    await rm(inputRoot, { recursive: true, force: true });
    throw error;
  }
}
