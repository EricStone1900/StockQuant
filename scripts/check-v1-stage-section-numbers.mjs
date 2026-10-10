import { readFile } from "node:fs/promises";
import { join } from "node:path";

export function findDuplicateStageSectionNumbers(markdown) {
  const firstLines = new Map();
  const duplicates = [];
  let fence = null;

  for (const [index, line] of markdown.split(/\r?\n/u).entries()) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/u.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === null) fence = { character: marker[0], length: marker.length };
      else if (marker[0] === fence.character && marker.length >= fence.length) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const heading = /^###\s+(8\.\d+)(?=\s)/u.exec(line);
    if (!heading) continue;

    const number = heading[1];
    const lineNumber = index + 1;
    const firstLine = firstLines.get(number);
    if (firstLine === undefined) firstLines.set(number, lineNumber);
    else duplicates.push({ number, firstLine, line: lineNumber });
  }

  return duplicates;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const stageFiles = [
    "01-environment-and-web-center.md",
    "02-small-data-and-qlib.md",
    "03-fake-broker-trading-loop.md",
    "04-daily-backtest.md",
    "05-scheduling-and-recovery.md",
  ];
  const failures = [];

  for (const file of stageFiles) {
    const path = join(process.cwd(), "docs/prd/v1-local-simulation", file);
    const markdown = await readFile(path, "utf8");
    for (const duplicate of findDuplicateStageSectionNumbers(markdown)) {
      failures.push(`${path}:${duplicate.line}: duplicate §${duplicate.number}; first declared at line ${duplicate.firstLine}`);
    }
  }

  for (const failure of failures) console.error(failure);
  console.log(`V1 stage numbered section IDs checked: ${stageFiles.length}; duplicates: ${failures.length}`);
  process.exit(failures.length === 0 ? 0 : 1);
}
