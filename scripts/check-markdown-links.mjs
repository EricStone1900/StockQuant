import { access, readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";

const projectRoot = process.cwd();
const ignoredDirectories = new Set([".git", ".corepack", "node_modules"]);

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(child)));
    if (entry.isFile() && extname(entry.name) === ".md") files.push(child);
  }
  return files;
}

function localTarget(rawTarget) {
  const target = rawTarget.trim().replace(/^<|>$/g, "").split("#", 1)[0];
  if (!target || /^(?:https?:|mailto:|app:|codex:)/u.test(target)) return null;
  return decodeURIComponent(target);
}

let checked = 0;
const failures = [];
const linkPattern = /!?(?:\[[^\]]*\])\(([^)]+)\)/gu;

for (const file of await collect(projectRoot)) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(linkPattern)) {
    const target = localTarget(match[1]);
    if (target === null) continue;
    checked += 1;
    const absolute = normalize(resolve(dirname(file), target));
    if (!absolute.startsWith(`${projectRoot}/`) && absolute !== projectRoot) {
      failures.push(`${file}: link escapes repository: ${match[1]}`);
      continue;
    }
    try {
      await access(absolute);
    } catch {
      failures.push(`${file}: missing target: ${match[1]}`);
    }
  }
}

for (const failure of failures) console.error(failure);
console.log(`Local Markdown links checked: ${checked}; failures: ${failures.length}`);
process.exit(failures.length === 0 ? 0 : 1);
