import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export function writeUniqueEvidence(directory, filename, contents) {
  mkdirSync(directory, { recursive: true });
  const path = join(directory, filename);
  const sha256 = createHash("sha256").update(contents).digest("hex");
  writeFileSync(path, contents, { flag: "wx" });
  const shaPath = `${path}.sha256`;
  const manifestPath = relative(process.cwd(), path).split(sep).join("/");
  writeFileSync(shaPath, `${sha256}  ${manifestPath}\n`, { flag: "wx" });
  return { path, shaPath, sha256 };
}
