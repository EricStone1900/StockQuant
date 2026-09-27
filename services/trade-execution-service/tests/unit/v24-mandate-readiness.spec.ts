import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assessV24MandateReadiness, type V24PaperMandatePreparation } from "../../src/domain/v24-mandate-readiness.js";

const mandate = JSON.parse(readFileSync(resolve(process.cwd(), "../../packages/contracts/fixtures/v24-paper-mandate-preparation-v1.json"), "utf8")) as V24PaperMandatePreparation;

describe("V2.4 Paper mandate preparation", () => {
  it("keeps authorization blocked while identity, limits, validity and approval evidence are unset", () => {
    expect(assessV24MandateReadiness({ mandate, market: "CN_A" })).toEqual({
      status: "BLOCKED", reason: "MANDATE_PREPARATION_ONLY", configurationGaps: mandate.configurationGaps
    });
  });

  it("rejects a market without an independent mandate policy", () => {
    expect(assessV24MandateReadiness({ mandate, market: "US_EQUITY" })).toEqual({
      status: "REJECTED", reason: "UNSUPPORTED_MARKET"
    });
  });
});
