import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const volume = process.env.STOCKQUANT_RESEARCH_ARTIFACT_VOLUME ?? "stockquant-v12_research-artifacts-v1";
if (volume !== "stockquant-v12_research-artifacts-v1") throw new Error("refusing unexpected artifact volume; set the exact reviewed volume name explicitly");
const image = "node:24.1.0-slim";
const root = await mkdtemp(resolve(tmpdir(), "stockquant-active-artifact-volume-"));
const snapshot = resolve(root, "snapshot");
const restored = resolve(root, "restored");
await Promise.all([mkdir(snapshot), mkdir(restored)]);

const snapshotProgram = String.raw`(async () => {
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const cp = require("node:child_process");
const source = "/source";
async function walk(dir, prefix = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  entries.sort((a,b) => a.name.localeCompare(b.name));
  const rows = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    const relative = prefix ? prefix + "/" + entry.name : entry.name;
    if (entry.isSymbolicLink()) throw new Error("symlink found in artifact volume");
    if (entry.isDirectory()) rows.push(...await walk(absolute, relative));
    else if (entry.isFile()) {
      const bytes = await fs.readFile(absolute);
      rows.push({ path: relative, size: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
    } else throw new Error("unsupported filesystem object in artifact volume");
  }
  return rows;
}
const files = await walk(source);
const manifest = { files, totalBytes: files.reduce((n, row) => n + row.size, 0) };
await fs.writeFile("/backup/source-manifest.json", JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
cp.execFileSync("tar", ["--numeric-owner", "-C", source, "-cpf", "/backup/artifacts.tar", "."], { stdio: "inherit" });
})().catch((error) => { console.error(error); process.exit(1); });
`;

try {
  execFileSync("docker", [
    "run", "--rm", "--network", "none", "--read-only", "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges", "--pids-limit", "64",
    "--mount", `type=volume,src=${volume},dst=/source,readonly`,
    "--mount", `type=bind,src=${snapshot},dst=/backup`,
    "--entrypoint", "node", image, "-e", snapshotProgram,
  ], { stdio: "inherit" });

  const source = JSON.parse(await readFile(resolve(snapshot, "source-manifest.json"), "utf8"));
  const archive = await readFile(resolve(snapshot, "artifacts.tar"));
  const archiveSha256 = createHash("sha256").update(archive).digest("hex");
  const listing = execFileSync("tar", ["-tf", resolve(snapshot, "artifacts.tar")], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  for (const entry of listing) {
    const normalized = entry.replace(/^\.\//u, "").replace(/\/$/u, "");
    if (normalized.startsWith("/") || normalized.split("/").some((segment) => segment === "..")) throw new Error("snapshot contains an unsafe restore path");
  }
  execFileSync("tar", ["--no-same-owner", "-C", restored, "-xpf", resolve(snapshot, "artifacts.tar")], { stdio: "inherit" });

  const actual = [];
  async function walk(dir, prefix = "") {
    const entries = await (await import("node:fs/promises")).readdir(dir, { withFileTypes: true });
    entries.sort((a,b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolute = resolve(dir, entry.name);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error("restored snapshot contains a symlink");
      if (entry.isDirectory()) await walk(absolute, relative);
      else if (entry.isFile()) {
        const bytes = await readFile(absolute);
        actual.push({ path: relative, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
      } else throw new Error("restored snapshot contains an unsupported filesystem object");
    }
  }
  await walk(restored);
  const actualManifest = { files: actual, totalBytes: actual.reduce((n, row) => n + row.size, 0) };
  if (JSON.stringify(actualManifest) !== JSON.stringify(source)) throw new Error("restored active Artifact volume differs from its source snapshot manifest");
  const result = { status: "PASS", volume, image, files: source.files.length, totalBytes: source.totalBytes, archiveBytes: (await stat(resolve(snapshot, "artifacts.tar"))).size, archiveSha256, sourceAndRestoreManifestSha256: createHash("sha256").update(JSON.stringify(source)).digest("hex"), activeServicesRestarted: false, activeVolumeWritten: false };
  console.log(JSON.stringify(result));
} finally {
  await rm(root, { recursive: true, force: true });
}
