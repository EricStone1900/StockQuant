import { lstat, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { buildEvidenceBundle, evidenceRequest, parseEvidenceExportArgs, serializeEvidence } from "./evidence-export-core.mjs";

const baseUrl = (process.env.STOCKQUANT_PLATFORM_API_URL ?? "http://127.0.0.1:3000").replace(/\/$/u, "");
try {
  const selection = parseEvidenceExportArgs(process.argv.slice(2));
  const request = evidenceRequest({ ...selection, baseUrl, sessionCookie: process.env.STOCKQUANT_EVIDENCE_SESSION_COOKIE });
  const response = await fetch(request.url, { headers: request.headers, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    console.error(`evidence export failed: HTTP ${response.status}`);
    process.exitCode = response.status === 401 || response.status === 403 ? 2 : 1;
  } else {
    const responseBody = await response.json();
    const bundle = buildEvidenceBundle({ ...selection, responseBody });
    const { serialized, manifest, manifestHash } = serializeEvidence(bundle);
    const outputDirectory = resolve(process.cwd(), request.outputDirectory);
    await mkdir(dirname(outputDirectory), { recursive: true });
    try { await lstat(outputDirectory); throw new Error(`evidence output already exists; preserving it: ${outputDirectory}`); }
    catch (error) { if (error?.code !== "ENOENT") throw error; }
    const stagingDirectory = await mkdtemp(join(dirname(outputDirectory), ".evidence-export-"));
    try {
      await writeFile(join(stagingDirectory, "evidence.json"), serialized, { flag: "wx" });
      await writeFile(join(stagingDirectory, "manifest.sha256"), manifest, { flag: "wx" });
      await rename(stagingDirectory, outputDirectory);
    } catch (error) {
      await rm(stagingDirectory, { recursive: true, force: true });
      throw error;
    }
    console.log(JSON.stringify({ outputDirectory, manifestHash, stageId: selection.stage, kind: selection.promotionRequestId ? "V3.2_PROMOTION_PREPARATION_SNAPSHOT" : "TEST_RUN_EVIDENCE" }, null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "evidence export failed");
  process.exitCode = 2;
}
