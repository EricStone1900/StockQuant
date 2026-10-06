import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { verifyFixtureAuthorizationRef } from "./fixture-authorization-ref.mjs";

test("authorization reference must resolve inside repository and match its exact hash", async () => {
  const root = await mkdtemp(join(tmpdir(), "sq-fixture-auth-"));
  try {
    const target = join(root, "evidence", "licenses", "source.md");
    await mkdir(join(root, "evidence", "licenses"), { recursive: true });
    await writeFile(target, "approved for research only\n");
    const hash = createHash("sha256").update(await readFile(target)).digest("hex");
    assert.deepEqual(await verifyFixtureAuthorizationRef(root, "evidence/licenses/source.md", hash), { ok: true });
    assert.deepEqual(await verifyFixtureAuthorizationRef(root, "evidence/licenses/source.md", "0".repeat(64)), { ok: false, reason: "authorization reference SHA-256 mismatch" });
    assert.equal((await verifyFixtureAuthorizationRef(root, "evidence/../private.md", hash)).ok, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("authorization reference cannot escape the repository through a symlink", async () => {
  const root = await mkdtemp(join(tmpdir(), "sq-fixture-auth-link-"));
  const outside = await mkdtemp(join(tmpdir(), "sq-fixture-auth-outside-"));
  try {
    const secret = join(outside, "approval.md");
    await writeFile(secret, "approval evidence\n");
    await mkdir(join(root, "evidence"), { recursive: true });
    const { symlink } = await import("node:fs/promises");
    await symlink(outside, join(root, "evidence", "licenses"));
    const hash = createHash("sha256").update(await readFile(secret)).digest("hex");
    const result = await verifyFixtureAuthorizationRef(root, "evidence/licenses/approval.md", hash);
    assert.deepEqual(result, { ok: false, reason: "authorization reference escapes repository" });
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
