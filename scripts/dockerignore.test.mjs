import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("Docker build context secret exclusions", () => {
  it("excludes root and nested environment files", async () => {
    const patterns = (await readFile(new URL("../.dockerignore", import.meta.url), "utf8"))
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    for (const pattern of [".env", ".env.*", "**/.env", "**/.env.*"]) {
      assert.ok(patterns.includes(pattern), `missing Docker context exclusion: ${pattern}`);
    }
  });
});
