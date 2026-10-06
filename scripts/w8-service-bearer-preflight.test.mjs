import assert from "node:assert/strict";
import { mkdtemp, readFile, chmod, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseEnvAssignments, requiredServiceTokens, runServiceBearerPreflight } from "./w8-service-bearer-preflight.mjs";

async function withEnvFile(contents, callback, mode = 0o600) {
  const directory = await mkdtemp(join(tmpdir(), "stockquant-w8-service-bearer-"));
  const path = join(directory, ".env.local");
  try {
    await writeFile(path, contents, { mode });
    await chmod(path, mode);
    return await callback(path);
  } finally { await rm(directory, { recursive: true, force: true }); }
}

test("parses shell-style assignments without interpreting secrets", () => {
  const parsed = parseEnvAssignments("# ignored\nexport STOCKQUANT_SERVICE_TOKEN_PLATFORM_API='one-value'\nSTOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION=\"two-value\"\n");
  assert.deepEqual(parsed.get("STOCKQUANT_SERVICE_TOKEN_PLATFORM_API"), ["one-value"]);
  assert.deepEqual(parsed.get("STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION"), ["two-value"]);
});

test("prepares only missing unique random tokens and never returns their values", async () => {
  const original = requiredServiceTokens.slice(0, 4).map((name, index) => `${name}=${String(index).padEnd(48, "x")}`).join("\n");
  await withEnvFile(`${original}\n`, async (path) => {
    const before = await runServiceBearerPreflight(path);
    assert.equal(before.status, "INCOMPLETE");
    assert.deepEqual(before.identities.slice(0, 4).map((item) => item.status), Array(4).fill("CONFIGURED"));
    assert.deepEqual(before.identities.slice(4).map((item) => item.status), Array(4).fill("UNSET"));
    assert.equal(JSON.stringify(before).includes(String(0).padEnd(48, "x")), false);

    const prepared = await runServiceBearerPreflight(path, { prepare: true });
    const file = await readFile(path, "utf8");
    const entries = parseEnvAssignments(file);
    const tokens = requiredServiceTokens.map((name) => entries.get(name)?.[0]);
    assert.equal(prepared.status, "PASS");
    assert.equal(new Set(tokens).size, requiredServiceTokens.length);
    assert.equal(tokens.every((token) => /^[A-Za-z0-9_-]{32,}$/u.test(token)), true);
    assert.equal(prepared.secretsPrinted, false);
    assert.equal(prepared.appliedToActiveServices, false);

    const second = await runServiceBearerPreflight(path, { prepare: true });
    assert.equal(second.status, "PASS");
    assert.equal(await readFile(path, "utf8"), file);
  });
});

test("rejects duplicated identities and unsafe file permissions", async () => {
  const duplicate = `${requiredServiceTokens[0]}=${"x".repeat(48)}\n${requiredServiceTokens[1]}=${"x".repeat(48)}\n`;
  await withEnvFile(duplicate, async (path) => {
    const result = await runServiceBearerPreflight(path);
    assert.equal(result.status, "FAIL");
    assert.deepEqual(result.duplicateIdentities, requiredServiceTokens.slice(0, 2));
    await assert.rejects(runServiceBearerPreflight(path, { prepare: true }), /invalid or duplicated/u);
  });
  await withEnvFile("", async (path) => {
    await assert.rejects(runServiceBearerPreflight(path), /permissions must be 0600/u);
  }, 0o644);
});
