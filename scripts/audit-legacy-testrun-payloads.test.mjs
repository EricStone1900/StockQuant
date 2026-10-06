import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { auditLegacyTestRunPayloads } from "./audit-legacy-testrun-payloads.mjs";

test("legacy payload audit matches exact stage and TestRun identities only", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "stockquant-w9-legacy-audit-"));
  const runId = "123e4567-e89b-42d3-a456-426614174000";
  const otherRunId = "123e4567-e89b-42d3-a456-426614174001";
  try {
    await mkdir(resolve(root, "docs/prd/v1-local-simulation"), { recursive: true });
    await mkdir(resolve(root, "evidence/local/source"), { recursive: true });
    await writeFile(resolve(root, "docs/prd/v1-local-simulation/00-version-plan.md"), "| [V1.1](./01.md) | Stage | Depends | PARTIALLY_IMPLEMENTED |\n");
    await writeFile(resolve(root, "docs/prd/v1-local-simulation/99-acceptance.md"), `| [V1.1](./01.md) | WAITING | WAITING | ${runId} | legacy evidence | pending |\n`);
    await writeFile(resolve(root, `evidence/local/source/${otherRunId}.json`), JSON.stringify({ run: { stageId: "V1.2", testRunId: runId }, note: "same UUID mentioned but wrong stage" }));
    const noExactMatch = await auditLegacyTestRunPayloads(root, ["V1"]);
    assert.equal(noExactMatch.unresolvedAssociations, 1);
    assert.equal(noExactMatch.exactPayloadMatches, 0);
    assert.deepEqual(noExactMatch.matches[0].payloadPaths, []);

    await writeFile(resolve(root, `evidence/local/source/${otherRunId}.json`), JSON.stringify({ run: { stageId: "V1.1", testRunId: runId } }));
    const exactMatch = await auditLegacyTestRunPayloads(root, ["V1"]);
    assert.equal(exactMatch.exactPayloadMatches, 1);
    assert.deepEqual(exactMatch.matches[0].payloadPaths, [`evidence/local/source/${otherRunId}.json`]);
    assert.equal(JSON.parse(await readFile(resolve(root, `evidence/local/source/${otherRunId}.json`), "utf8")).run.testRunId, runId);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
