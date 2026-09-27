import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assessV24ExecutionPolicyReadiness, type V24ExecutionPolicy } from "../../src/domain/v24-execution-policy.js";

const policy = JSON.parse(readFileSync(resolve(process.cwd(), "../../packages/contracts/fixtures/v24-paper-execution-policy-v1.json"), "utf8")) as V24ExecutionPolicy;
const paperFake = { environmentMode: "PAPER", brokerMode: "FAKE", liveTradingEnabled: false };

describe("V2.4 Paper execution policy preparation", () => {
  it("keeps the policy blocked while strategy, mandate, deviation, risk, fee and US policy remain unset", () => {
    expect(assessV24ExecutionPolicyReadiness({ policy, market: "CN_A", ...paperFake })).toEqual({
      status: "BLOCKED", reason: "POLICY_PREPARATION_ONLY", configurationGaps: policy.configurationGaps
    });
  });

  it("rejects LIVE trading and non-Fake brokers", () => {
    expect(assessV24ExecutionPolicyReadiness({ policy, market: "CN_A", ...paperFake, brokerMode: "LIVE" })).toEqual({
      status: "REJECTED", reason: "LIVE_OR_NON_FAKE_MODE"
    });
    expect(assessV24ExecutionPolicyReadiness({ policy, market: "CN_A", ...paperFake, liveTradingEnabled: true })).toEqual({
      status: "REJECTED", reason: "LIVE_OR_NON_FAKE_MODE"
    });
  });

  it("keeps US execution blocked until an independent US policy is defined", () => {
    expect(assessV24ExecutionPolicyReadiness({ policy, market: "US_EQUITY", ...paperFake })).toEqual({
      status: "REJECTED", reason: "UNSUPPORTED_MARKET"
    });
  });
});
