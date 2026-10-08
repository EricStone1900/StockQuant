import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

async function runCodeSuite(stage) {
  const directory = await mkdtemp(join(tmpdir(), "stockquant-code-suite-routing-"));
  const mock = join(directory, "mock-spawn-sync.mjs");
  await writeFile(mock, `import childProcess from "node:child_process"; import { syncBuiltinESMExports } from "node:module"; childProcess.spawnSync = () => ({ status: 0, stdout: "", stderr: "" }); syncBuiltinESMExports();\n`);
  try {
    return spawnSync(process.execPath, ["--import", mock, "scripts/verify-stage.mjs", "--stage", stage, "--suite", "code"], { encoding: "utf8", timeout: 10_000 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("V1.3 and V1.4 code suite entry points route through shared complete command plans", async () => {
  const v13 = await runCodeSuite("V1.3");
  assert.equal(v13.status, 0, v13.stderr);
  assert.match(v13.stdout, /\[V1\.3 code suite\] pnpm lint/u);
  assert.match(v13.stdout, /\[V1\.3 code suite\] pnpm test:contract/u);
  const v14 = await runCodeSuite("V1.4");
  assert.equal(v14.status, 0, v14.stderr);
  assert.match(v14.stdout, /\[V1\.4 code suite\] .*test-v14-rule-parity-postgres\.mjs/u);
  assert.match(v14.stdout, /\[V1\.4 code suite\] .*test:v14-report-publication-fencing/u);
});
