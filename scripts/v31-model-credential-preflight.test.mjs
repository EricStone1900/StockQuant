import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, chmod, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkModelCredentialFile, modelCallAuthorizationKey, modelCredentialKeys } from "./v31-model-credential-preflight.mjs";

async function withEnvFile(text, mode, run) {
  const root = await mkdtemp(join(tmpdir(), "stockquant-v31-credentials-"));
  const path = join(root, ".env.local");
  try {
    await writeFile(path, text, { mode });
    await chmod(path, mode);
    await run(path);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("credential preflight reports names only and never authorizes calls", async () => {
  const secretValues = ["deepseek-secret-fixture", "siliconflow-secret-fixture"];
  const text = [...modelCredentialKeys.map((key, index) => `${key}='${secretValues[index]}'`), `${modelCallAuthorizationKey}=false`].join("\n");
  await withEnvFile(text, 0o600, async (path) => {
    const result = await checkModelCredentialFile(path);
    assert.deepEqual(result, {
      status: "READY_FOR_NEXT_GATE", filePresent: true, privateMode: true,
      configuredReferences: modelCredentialKeys, missingReferences: [], duplicateReferences: [],
      providerCallsAuthorized: false,
      modelCalls: "NOT_RUN", liveCallsAuthorized: false,
    });
    assert.equal(JSON.stringify(result).includes(secretValues[0]), false);
    assert.equal(JSON.stringify(result).includes(secretValues[1]), false);
  });
});

test("credential preflight reports explicit Provider authorization without treating it as live readiness", async () => {
  const text = [...modelCredentialKeys.map((key) => `${key}=secret-value`), `${modelCallAuthorizationKey}=true`].join("\n");
  await withEnvFile(text, 0o600, async (path) => {
    const result = await checkModelCredentialFile(path);
    assert.equal(result.status, "READY_FOR_NEXT_GATE");
    assert.equal(result.providerCallsAuthorized, true);
    assert.equal(result.liveCallsAuthorized, false);
    assert.equal(result.modelCalls, "NOT_RUN");
  });
});

test("credential preflight blocks malformed Provider authorization values", async () => {
  const text = [...modelCredentialKeys.map((key) => `${key}=secret-value`), `${modelCallAuthorizationKey}=yes`].join("\n");
  await withEnvFile(text, 0o600, async (path) => {
    const result = await checkModelCredentialFile(path);
    assert.equal(result.status, "BLOCKED");
    assert.equal(result.providerCallsAuthorized, false);
    assert.equal(result.modelCalls, "NOT_RUN");
  });
});

test("credential preflight blocks duplicate references", async () => {
  const text = `${modelCredentialKeys[0]}=first\n${modelCredentialKeys[0]}=second\n`;
  await withEnvFile(text, 0o600, async (path) => {
    const result = await checkModelCredentialFile(path);
    assert.equal(result.status, "BLOCKED");
    assert.equal(result.privateMode, true);
    assert.deepEqual(result.missingReferences, [modelCredentialKeys[1]]);
    assert.deepEqual(result.duplicateReferences, [modelCredentialKeys[0]]);
    assert.equal(result.modelCalls, "NOT_RUN");
    assert.equal(result.liveCallsAuthorized, false);
    assert.equal(result.providerCallsAuthorized, false);
  });
});

test("credential preflight refuses to read a broadly accessible file", async () => {
  await withEnvFile(modelCredentialKeys.map((key) => `${key}=secret`).join("\n"), 0o640, async (path) => {
    const result = await checkModelCredentialFile(path);
    assert.equal(result.status, "BLOCKED");
    assert.equal(result.privateMode, false);
    assert.deepEqual(result.configuredReferences, []);
    assert.deepEqual(result.missingReferences, modelCredentialKeys);
  });
});

test("credential preflight blocks a missing file without exposing values", async () => {
  const result = await checkModelCredentialFile(join(tmpdir(), "missing-stockquant-v31.env"));
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.filePresent, false);
  assert.equal(result.modelCalls, "NOT_RUN");
  assert.equal(result.liveCallsAuthorized, false);
  assert.equal(result.providerCallsAuthorized, false);
});
