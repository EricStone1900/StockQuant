import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = process.argv.slice(2);

if (roots.length === 0) {
  console.error("usage: node scripts/validate-json.mjs <path>...");
  process.exit(2);
}

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collect(child)));
    } else if (entry.isFile() && extname(entry.name) === ".json") {
      files.push(child);
    }
  }
  return files;
}

let failures = 0;
let checked = 0;

for (const root of roots) {
  for (const file of await collect(root)) {
    checked += 1;
    try {
      JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      failures += 1;
      console.error(`${file}: ${error.message}`);
    }
  }
}

console.log(`JSON files checked: ${checked}; failures: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
