import { describe, expect, it } from "vitest";
import { decodeRunnerJobCursor, encodeRunnerJobCursor } from "../../src/application/v33-queue-cursor.js";

describe("V3.3 runner queue keyset cursor", () => {
  it("round-trips an exact stable ordering key", () => {
    const cursor = { submittedAt: "2026-09-27T06:00:00.123Z", jobId: "run:experiment-1" };
    expect(decodeRunnerJobCursor(encodeRunnerJobCursor(cursor))).toEqual(cursor);
  });
  it("rejects malformed, oversized, noncanonical, and extra-field cursors", () => {
    expect(decodeRunnerJobCursor("***")).toBeNull();
    expect(decodeRunnerJobCursor("a".repeat(2049))).toBeNull();
    expect(decodeRunnerJobCursor(Buffer.from(JSON.stringify({ submittedAt: "2026-09-27", jobId: "x", extra: 1 })).toString("base64url"))).toBeNull();
    expect(() => encodeRunnerJobCursor({ submittedAt: "2026-09-27", jobId: "x" })).toThrow("invalid runner queue cursor");
  });
});
