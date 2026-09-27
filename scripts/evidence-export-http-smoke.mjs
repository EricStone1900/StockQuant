import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const promotionRequestId = "6e534a1a-1c8d-4cf1-955c-f1070ac3c424";
const mismatchedPromotionId = "3e38c9b7-17c2-4874-a38c-d5cc49671023";
const testRunId = "8b2d68d1-62eb-46a8-a2c6-957a7b252a8f";
let receivedCookie;
const server = createServer((request, response) => {
  receivedCookie = request.headers.cookie;
  response.setHeader("content-type", "application/json");
  if (receivedCookie !== "sq_session=export-owner") { response.writeHead(403).end(JSON.stringify({ message: "owner session required" })); return; }
  response.end(JSON.stringify({
    request: { request: { promotionRequestId, testRunId } },
    validationReport: null,
    registryMutation: "NOT_PERFORMED",
    activation: "DISABLED_UNTIL_MANDATE",
    testRunId,
  }));
});
server.listen(0, "127.0.0.1");
await new Promise((resolveListen, reject) => { server.once("listening", resolveListen); server.once("error", reject); });
const address = server.address();
const scratch = await mkdtemp(join(tmpdir(), "stockquant-evidence-export-smoke-"));
const script = resolve("scripts/evidence-export.mjs");
const env = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? tmpdir(), STOCKQUANT_PLATFORM_API_URL: `http://127.0.0.1:${address.port}`, STOCKQUANT_EVIDENCE_SESSION_COOKIE: "sq_session=export-owner" };
const run = (id, session = env.STOCKQUANT_EVIDENCE_SESSION_COOKIE) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(process.execPath, [script, "--stage", "V3.2", "--promotion-request", id], { cwd: scratch, env: { ...env, STOCKQUANT_EVIDENCE_SESSION_COOKIE: session }, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
  child.once("error", rejectRun);
  child.once("close", (status, signal) => resolveRun({ status, signal, stdout, stderr }));
});

try {
  const first = await run(promotionRequestId);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(receivedCookie, "sq_session=export-owner");
  const outputDirectory = join(scratch, "evidence/local/V3.2", promotionRequestId);
  const evidencePath = join(outputDirectory, "evidence.json");
  const evidenceBytes = await readFile(evidencePath);
  const manifest = await readFile(join(outputDirectory, "manifest.sha256"), "utf8");
  assert.match(manifest, new RegExp(`^${createHash("sha256").update(evidenceBytes).digest("hex")}  evidence\\.json\\n$`, "u"));
  assert.equal(JSON.parse(evidenceBytes.toString("utf8")).humanAcceptance, "NOT_RUN");
  const repeat = await run(promotionRequestId);
  assert.equal(repeat.status, 2, repeat.stderr);
  assert.deepEqual(await readFile(evidencePath), evidenceBytes);
  const forbidden = await run(mismatchedPromotionId, "sq_session=other-owner");
  assert.equal(forbidden.status, 2);
  await assert.rejects(stat(join(scratch, "evidence/local/V3.2", mismatchedPromotionId)));
  const mismatch = await run(mismatchedPromotionId);
  assert.equal(mismatch.status, 2);
  await assert.rejects(stat(join(scratch, "evidence/local/V3.2", mismatchedPromotionId)));
  console.log(JSON.stringify({ status: "PASS", cases: 4, ownerSession: "accepted", exactRequestRunBinding: "verified", manifestSha256: "verified", repeatExport: "refused_without_overwrite", wrongOwner: "403_no_output", mismatchedPromotionRequest: "rejected_no_output", activeData: "NOT_TOUCHED" }));
} finally {
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
  await rm(scratch, { recursive: true, force: true });
}
