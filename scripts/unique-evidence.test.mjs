import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { test } from "node:test";
import { writeUniqueEvidence } from "./unique-evidence.mjs";

test("unique evidence writes a verifiable digest and preserves existing files on collision", () => {
  const directory = mkdtempSync(join(tmpdir(), "stockquant-unique-evidence-"));
  try {
    const first = writeUniqueEvidence(directory, "run-one.json", "{\"run\":1}\n");
    const second = writeUniqueEvidence(directory, "run-two.json", "{\"run\":2}\n");

    assert.notEqual(first.path, second.path);
    assert.match(first.sha256, /^[a-f0-9]{64}$/u);
    const manifestPath = relative(process.cwd(), first.path).split(sep).join("/");
    assert.equal(readFileSync(first.shaPath, "utf8"), `${first.sha256}  ${manifestPath}\n`);
    assert.throws(() => writeUniqueEvidence(directory, "run-one.json", "overwritten\n"), { code: "EEXIST" });
    assert.equal(readFileSync(first.path, "utf8"), "{\"run\":1}\n");
    assert.equal(readFileSync(first.shaPath, "utf8"), `${first.sha256}  ${manifestPath}\n`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
