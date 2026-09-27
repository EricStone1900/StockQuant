import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assessV24PaperReadiness } from "../../src/domain/v24-paper-readiness.js";
import type { V24ExecutionPolicy } from "../../src/domain/v24-execution-policy.js";
import type { V24PaperMandatePreparation } from "../../src/domain/v24-mandate-readiness.js";

const policy = JSON.parse(readFileSync(resolve(process.cwd(), "../../packages/contracts/fixtures/v24-paper-execution-policy-v1.json"), "utf8")) as V24ExecutionPolicy;
const mandate = JSON.parse(readFileSync(resolve(process.cwd(), "../../packages/contracts/fixtures/v24-paper-mandate-preparation-v1.json"), "utf8")) as V24PaperMandatePreparation;

describe("V2.4 combined Paper readiness", () => {
  it("keeps supported CN Paper blocked and explicitly does not run risk, reserve, or submit", () => {
    const result = assessV24PaperReadiness({ policy, mandate, market: "CN_A" });
    expect(result.status).toBe("BLOCKED");
    expect(result.policyReadiness.status).toBe("BLOCKED");
    expect(result.mandateReadiness.status).toBe("BLOCKED");
    expect(result.riskEvaluation.status).toBe("NOT_RUN");
    expect(result.resourceReservation.status).toBe("NOT_RUN");
    expect(result.orderSubmissionEnabled).toBe(false);
    expect(result.liveTradingEnabled).toBe(false);
  });

  it("rejects unsupported US policy while retaining an explicit disabled execution state", () => {
    const result = assessV24PaperReadiness({ policy, mandate, market: "US_EQUITY" });
    expect(result.status).toBe("REJECTED");
    expect(result.policyReadiness).toMatchObject({ status: "REJECTED", reason: "UNSUPPORTED_MARKET" });
    expect(result.mandateReadiness).toMatchObject({ status: "REJECTED", reason: "UNSUPPORTED_MARKET" });
    expect(result.orderSubmissionEnabled).toBe(false);
  });
});
