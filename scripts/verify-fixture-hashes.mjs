import { createHash } from "node:crypto";
import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";

const projectRoot = process.cwd();
const fixturesRoot = join(projectRoot, "fixtures");

async function collectManifests(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const manifests = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) manifests.push(...(await collectManifests(child)));
    if (entry.isFile() && entry.name === "manifest.json") manifests.push(child);
  }
  return manifests;
}

const failures = [];
let checked = 0;

for (const manifestPath of await collectManifests(fixturesRoot)) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.files)) {
    failures.push(`${manifestPath}: files must be an array`);
    continue;
  }
  for (const file of manifest.files) {
    checked += 1;
    const absolute = normalize(resolve(projectRoot, file.path));
    if (!absolute.startsWith(`${fixturesRoot}/`)) {
      failures.push(`${manifestPath}: fixture path escapes fixtures/: ${file.path}`);
      continue;
    }
    try {
      await access(absolute);
      const actual = createHash("sha256").update(await readFile(absolute)).digest("hex");
      if (actual !== file.sha256) {
        failures.push(`${manifestPath}: SHA-256 mismatch for ${file.path}; expected ${file.sha256}, got ${actual}`);
      }
    } catch (error) {
      failures.push(`${manifestPath}: cannot read ${file.path}: ${error.message}`);
    }
  }
}

for (const failure of failures) console.error(failure);
console.log(`Fixture files checked: ${checked}; failures: ${failures.length}`);
process.exit(failures.length === 0 ? 0 : 1);
