import { createHash } from "node:crypto";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION_DIRECTORIES = {
  V1: "v1-local-simulation",
  V2: "v2-data-and-replay",
  V3: "v3-research-and-ubuntu",
};

function inside(root, candidate) {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(path));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") files.push(path);
  }
  return files;
}

async function verifyManifest(manifestPath, repositoryRoot) {
  const failures = [];
  let checked = 0;
  const lines = (await readFile(manifestPath, "utf8")).split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    const match = line.match(/^([a-f\d]{64})\s{2,}(.+)$/i);
    if (!match) {
      failures.push(`${manifestPath}:${index + 1}: malformed SHA-256 entry`);
      continue;
    }
    // Repository audit manifests use repository-root-relative paths. Local
    // evidence exports are portable bundles and keep paths relative to the
    // export directory containing their manifest.
    const manifestRelativePath = relative(repositoryRoot, manifestPath);
    const localExport = manifestRelativePath.startsWith(`evidence${sep}local${sep}`);
    const target = resolve(localExport ? dirname(manifestPath) : repositoryRoot, match[2]);
    if (!inside(repositoryRoot, target)) {
      failures.push(`${manifestPath}:${index + 1}: target escapes repository`);
      continue;
    }
    try {
      if (!(await stat(target)).isFile()) throw new Error("not a regular file");
      const actual = createHash("sha256").update(await readFile(target)).digest("hex");
      checked += 1;
      if (actual !== match[1].toLowerCase()) failures.push(`${manifestPath}:${index + 1}: SHA-256 mismatch for ${match[2]}`);
    } catch (error) {
      failures.push(`${manifestPath}:${index + 1}: cannot verify ${match[2]} (${error.message})`);
    }
  }
  if (checked === 0 && failures.length === 0) failures.push(`${manifestPath}: empty manifest`);
  return { manifest: relative(repositoryRoot, manifestPath), entriesChecked: checked, failures };
}

export async function auditVersionEvidence(repositoryRoot, version) {
  const versionDirectory = VERSION_DIRECTORIES[version];
  if (!versionDirectory) throw new Error("version must be V1, V2, or V3");
  const root = await realpath(repositoryRoot);
  const docsRoot = resolve(root, "docs/prd", versionDirectory);
  const files = await markdownFiles(docsRoot);
  const missingEvidence = [];
  const manifests = new Map();
  const historicalManifests = new Set();
  let evidenceReferences = 0;

  for (const source of files) {
    const text = await readFile(source, "utf8");
    for (const match of text.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)) {
      const rawTarget = match[2].trim().split(/\s+/, 1)[0];
      if (/^(?:[a-z]+:|#|\/\/)/i.test(rawTarget)) continue;
      const targetWithoutAnchor = decodeURIComponent(rawTarget.split("#", 1)[0]);
      if (!targetWithoutAnchor.includes("evidence/")) continue;
      evidenceReferences += 1;
      const target = resolve(dirname(source), targetWithoutAnchor);
      if (!inside(root, target)) {
        missingEvidence.push(`${relative(root, source)}: evidence reference escapes repository`);
        continue;
      }
      try {
        const resolvedTarget = await realpath(target);
        if (!inside(root, resolvedTarget) || !(await stat(resolvedTarget)).isFile()) throw new Error("not a repository file");
        if (target.endsWith(".sha256")) {
          const historical = /historical execution snapshot|历史执行快照|历史源码快照/iu.test(match[1]);
          if (historical) historicalManifests.add(resolvedTarget);
          else { manifests.set(resolvedTarget, resolvedTarget); historicalManifests.delete(resolvedTarget); }
        }
      } catch {
        missingEvidence.push(`${relative(root, source)}: missing evidence target ${targetWithoutAnchor}`);
      }
    }
  }

  const manifestResults = [];
  for (const manifest of manifests.values()) manifestResults.push(await verifyManifest(manifest, root));
  const failures = [...missingEvidence, ...manifestResults.flatMap(({ failures: items }) => items)];
  return {
    version,
    status: failures.length ? "FAIL" : evidenceReferences ? "PASS" : "INCOMPLETE",
    markdownFilesChecked: files.length,
    evidenceReferences,
    manifestsChecked: manifestResults.length,
    historicalManifestsSkipped: historicalManifests.size,
    manifestEntriesChecked: manifestResults.reduce((total, item) => total + item.entriesChecked, 0),
    manifestResults,
    missingEvidence,
    failures,
    scope: "Checks linked local evidence-file existence and active SHA-256 manifests; manifests explicitly labeled as historical execution snapshots are retained but not compared with the current worktree. This does not prove evidence completeness, business correctness, deployment, observation, or human acceptance.",
  };
}

async function main() {
  const args = process.argv.slice(2);
  const version = args[args.indexOf("--version") + 1];
  if (!VERSION_DIRECTORIES[version]) {
    console.error("usage: node scripts/verify-version-evidence.mjs --version V1|V2|V3");
    process.exit(2);
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const result = await auditVersionEvidence(root, version);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.status === "PASS" ? 0 : result.status === "INCOMPLETE" ? 2 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
