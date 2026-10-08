import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { buildEvidenceBundle, decodeV12QlibArtifact, decodeV14Report, decodeV31Artifact, decodeV33Artifact, evidenceRequest, parseEvidenceExportArgs, qlibArtifactPath, serializeEvidence, v12QlibArtifactPath, v14ReportArtifactPath, v31ArtifactPath, v31ArtifactRefs, v33ArtifactRefs } from "./evidence-export-core.mjs";

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
    const attachments = [];
    if (selection.stage === "V3.1") {
      for (const ref of v31ArtifactRefs(bundle)) {
        const artifactResponse = await fetch(v31ArtifactPath(bundle, ref, baseUrl), { headers: request.headers, signal: AbortSignal.timeout(10_000) });
        if (!artifactResponse.ok) throw new Error(`V3.1 Artifact export failed: HTTP ${artifactResponse.status}`);
        const bytes = decodeV31Artifact(ref, await artifactResponse.json());
        attachments.push({ filename: `v31-${ref.kind.toLowerCase()}-${ref.sha256}.bin`, bytes });
      }
    }
    if (selection.stage === "V3.3") {
      for (const ref of v33ArtifactRefs(bundle)) {
        const url = `${baseUrl}/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(selection.runId)}/artifacts/${encodeURIComponent(ref.artifactId)}`;
        const artifactResponse = await fetch(url, { headers: request.headers, signal: AbortSignal.timeout(10_000) });
        if (!artifactResponse.ok) throw new Error(`V3.3 Artifact export failed: HTTP ${artifactResponse.status}`);
        const bytes = decodeV33Artifact(bundle, ref, await artifactResponse.json());
        attachments.push({ filename: `v33-round-${ref.roundIndex}-${ref.sha256}.json`, bytes });
      }
      bundle.artifacts = v33ArtifactRefs(bundle).map((ref) => ({ ...ref, filename: `v33-round-${ref.roundIndex}-${ref.sha256}.json` }));
    }
    if (selection.stage === "V1.2") {
      const artifactUrl = v12QlibArtifactPath(bundle, baseUrl);
      if (artifactUrl) {
        const artifactResponse = await fetch(artifactUrl, { headers: request.headers, signal: AbortSignal.timeout(10_000) });
        if (!artifactResponse.ok) throw new Error(`V1.2 Qlib Artifact export failed: HTTP ${artifactResponse.status}`);
        const artifactBody = await artifactResponse.json();
        const bytes = decodeV12QlibArtifact(bundle, artifactBody);
        attachments.push({ filename: `v12-qlib-${bundle.testRunId}-${bundle.evidence.qlibFit.artifactRef.sha256}.json`, bytes });
        bundle.artifacts = [{ ...bundle.evidence.qlibFit.artifactRef, filename: `v12-qlib-${bundle.testRunId}-${bundle.evidence.qlibFit.artifactRef.sha256}.json` }];
      }
    }
    if (selection.stage === "V1.4") {
      const artifactUrl = v14ReportArtifactPath(bundle, baseUrl);
      if (artifactUrl) {
        const artifactResponse = await fetch(artifactUrl, { headers: request.headers, signal: AbortSignal.timeout(10_000) });
        if (!artifactResponse.ok) throw new Error(`V1.4 report export failed: HTTP ${artifactResponse.status}`);
        const bytes = decodeV14Report(bundle, await artifactResponse.json());
        const ref = bundle.artifactRefs.find((item) => item.kind === "BACKTEST_REPORT");
        attachments.push({ filename: `v14-report-${bundle.testRunId}-${ref.sha256}.json`, bytes });
        bundle.artifacts = [{ ...ref, filename: `v14-report-${bundle.testRunId}-${ref.sha256}.json` }];
      }
    }
    const artifactUrl = selection.stage === "V2.3" ? qlibArtifactPath(bundle, baseUrl) : null;
    if (artifactUrl) {
      const artifactResponse = await fetch(artifactUrl, { headers: request.headers, signal: AbortSignal.timeout(10_000) });
      if (!artifactResponse.ok) throw new Error(`Qlib Artifact export failed: HTTP ${artifactResponse.status}`);
      const artifact = await artifactResponse.json();
      const ref = bundle.evidence?.crossService?.research?.artifactRef;
      if (artifact.testRunId !== bundle.testRunId || artifact.artifactId !== ref.artifactId || artifact.sha256 !== ref.sha256 || artifact.ownerId !== bundle.ownerId || artifact.mediaType !== "application/vnd.stockquant.qlib-fixture-model+json") throw new Error("Qlib Artifact response identity does not match the TestRun ArtifactRef");
      const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}` : JSON.stringify(value);
      const digest = createHash("sha256").update(canonical(artifact.payload)).digest("hex");
      if (digest !== artifact.sha256 || digest !== artifact.artifactId) throw new Error("Qlib Artifact content hash does not match the persisted TestRun ArtifactRef");
      attachments.push({ filename: "qlib-fixture-artifact.json", bytes: Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`) });
    }
    const { serialized, manifest, manifestHash, attachments: files } = serializeEvidence(bundle, attachments);
    const outputDirectory = resolve(process.cwd(), request.outputDirectory);
    await mkdir(dirname(outputDirectory), { recursive: true });
    try { await lstat(outputDirectory); throw new Error(`evidence output already exists; preserving it: ${outputDirectory}`); }
    catch (error) { if (error?.code !== "ENOENT") throw error; }
    const stagingDirectory = await mkdtemp(join(dirname(outputDirectory), ".evidence-export-"));
    try {
      await writeFile(join(stagingDirectory, "evidence.json"), serialized, { flag: "wx" });
      for (const file of files) await writeFile(join(stagingDirectory, file.filename), file.bytes, { flag: "wx" });
      await writeFile(join(stagingDirectory, "manifest.sha256"), manifest, { flag: "wx" });
      await rename(stagingDirectory, outputDirectory);
    } catch (error) {
      await rm(stagingDirectory, { recursive: true, force: true });
      throw error;
    }
    const kind = selection.promotionRequestId ? "V3.2_PROMOTION_PREPARATION_SNAPSHOT" : selection.stage === "V3.2" ? "V3.2_READINESS_TEST_RUN" : selection.stage === "V3.1" ? "V3.1_TEST_RUN_WITH_ARTIFACTS" : selection.stage === "V3.3" ? "V3.3_BUSINESS_TEST_RUN" : "TEST_RUN_EVIDENCE";
    console.log(JSON.stringify({ outputDirectory, manifestHash, stageId: selection.stage, testRunId: selection.runId ?? null, kind, attachments: files.map(({ filename, bytes }) => ({ filename, sizeBytes: bytes.length })) }, null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "evidence export failed");
  process.exitCode = 2;
}
