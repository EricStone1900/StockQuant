import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "../../src/domain/lifecycle.js";

describe("replay lifecycle", () => {
  it("allows pause/resume and terminal cancellation", () => {
    expect(canTransition("RUNNING", "PAUSED")).toBe(true);
    expect(canTransition("PAUSED", "RUNNING")).toBe(true);
    expect(canTransition("RUNNING", "CANCELLED")).toBe(true);
    expect(canTransition("COMPLETED", "RUNNING")).toBe(false);
  });

  it("rejects transitions out of terminal states", () => {
    expect(() => assertTransition("CANCELLED", "RUNNING")).toThrow("invalid replay status transition");
  });
});
