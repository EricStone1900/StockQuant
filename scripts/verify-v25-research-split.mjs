import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const protocolPath = join(repositoryRoot, "docs/prd/v2-data-and-replay/v2.5-research-split-v1.json");
const protocol = JSON.parse(await readFile(protocolPath, "utf8"));
const dataRoot = resolve(repositoryRoot, process.argv[2] ?? protocol.source.localArchive);
if (!isAbsolute(dataRoot)) throw new Error("research archive path must be absolute or repository-relative");
const rootStat = await lstat(dataRoot);
if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error("research archive must be a real directory");
const rootRealPath = await realpath(dataRoot);
const manifestPath = join(rootRealPath, "manifest.json");
const manifestBytes = await readFile(manifestPath);
const manifestHash = createHash("sha256").update(manifestBytes).digest("hex");
if (manifestHash !== protocol.source.manifestSha256) throw new Error(`source manifest SHA-256 mismatch: ${manifestHash}`);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
if (manifest.status !== "COMPLETED" || manifest.sourceMode !== "READ_ONLY" || manifest.frequency !== protocol.source.frequency || manifest.rows !== protocol.source.totalBars || manifest.selectedCodes.join(",") !== protocol.source.selectedCodes.join(",")) throw new Error("source manifest metadata does not match the frozen protocol");
if (Object.keys(manifest.artifacts).length !== protocol.source.securityCount) throw new Error("source manifest security count does not match the frozen protocol");

const counts = new Map();
let verifiedFiles = 0;
for (const security of protocol.source.selectedCodes) {
  const artifact = manifest.artifacts[security];
  if (!artifact || artifact.rows !== protocol.source.barsPerSecurity || artifact.quality !== "PASS") throw new Error(`missing or invalid source partition for ${security}`);
  if (typeof artifact.path !== "string" || artifact.path.includes("\\") || artifact.path.startsWith("/") || artifact.path.split("/").some((part) => part === ".." || part === "")) throw new Error(`unsafe partition path for ${security}`);
  const parts = artifact.path.split("/");
  let path = rootRealPath;
  for (const part of parts) {
    path = join(path, part);
    const componentStat = await lstat(path);
    if (componentStat.isSymbolicLink()) throw new Error(`partition path contains a symbolic link: ${security}`);
  }
  const pathStat = await lstat(path);
  if (!pathStat.isFile() || pathStat.isSymbolicLink() || relative(rootRealPath, await realpath(path)).startsWith(`..${sep}`)) throw new Error(`partition path is not a regular file within the archive: ${security}`);
  const hash = createHash("sha256");
  const perDate = new Map();
  const fileStream = createReadStream(path);
  fileStream.on("data", (chunk) => hash.update(chunk));
  const lines = createInterface({ input: fileStream, crlfDelay: Infinity });
  let header = true;
  let rowCount = 0;
  let columns;
  for await (const line of lines) {
    if (header) {
      header = false;
      columns = line.split(",");
      if (columns.join(",") !== "date,time,code,open,high,low,close,volume,amount") throw new Error(`unexpected header in ${security}`);
      continue;
    }
    if (!line) continue;
    const row = line.split(",");
    if (row.length !== columns.length || row[2] !== security || !/^\d{4}-\d{2}-\d{2}$/u.test(row[0])) throw new Error(`malformed row in ${security} at row ${rowCount + 2}`);
    const count = (perDate.get(row[0]) ?? 0) + 1;
    perDate.set(row[0], count);
    rowCount += 1;
  }
  const fileHash = hash.digest("hex");
  if (rowCount !== artifact.rows || fileHash !== artifact.sha256) throw new Error(`partition row count or SHA-256 mismatch for ${security}`);
  if (perDate.size !== protocol.sessionDates.length || protocol.sessionDates.some((date) => perDate.get(date) !== 48)) throw new Error(`session coverage mismatch for ${security}`);
  counts.set(security, rowCount);
  verifiedFiles += 1;
}

const indices = Object.values(protocol.windows);
if (protocol.sessionDates.length !== protocol.source.sessionCount || indices[0].startIndex !== 0 || indices.at(-1).endIndexExclusive !== protocol.sessionDates.length) throw new Error("frozen windows do not span the declared session list");
for (let index = 1; index < indices.length; index += 1) if (indices[index - 1].endIndexExclusive !== indices[index].startIndex) throw new Error("frozen windows contain an overlap or gap");
if (protocol.windows.warmup.endIndexExclusive - protocol.windows.warmup.startIndex !== protocol.evaluationRules.warmupLookbackSessions) throw new Error("warmup window does not match the declared lookback");
process.stdout.write(`${JSON.stringify({ status: "PASS", protocolId: protocol.protocolId, sourceManifestSha256: manifestHash, verifiedFiles, securities: counts.size, sessions: protocol.sessionDates.length, barsPerSecurity: protocol.source.barsPerSecurity, totalBars: protocol.source.totalBars, windows: Object.fromEntries(Object.entries(protocol.windows).map(([name, window]) => [name, { start: protocol.sessionDates[window.startIndex], end: protocol.sessionDates[window.endIndexExclusive - 1], sessions: window.endIndexExclusive - window.startIndex }])) })}\n`);
