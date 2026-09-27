import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { V32PromotionRequest } from "../../src/contracts/generated-types.js";
import { recomputeV32SyntheticFixture, verifyV32SyntheticFixture } from "../../src/v32-independent-recompute.js";

const root = join(process.cwd(), "../..");
const dir = join(root, "fixtures/v3/v3.2-independent-validation-v1");
const sourceBars = readFileSync(join(dir, "daily-bars.csv"), "utf8");
const candidate = JSON.parse(readFileSync(join(dir, "candidate.json"), "utf8"));
const design = JSON.parse(readFileSync(join(dir, "validation-design.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const frozenFiles = Object.fromEntries(["daily-bars.csv", "candidate.json", "validation-design.json"].map((name) => [name, readFileSync(join(dir, name))]));
const request = {
  schemaVersion: "v3.2-promotion-request-v1", promotionRequestId: "9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2",
  testRunId: "ff979c31-6f72-492d-8091-89cde9f05494", experimentId: "275a9fe1-651f-444a-a6c2-c7f008509127",
  candidateSource: "FIXTURE", candidateArtifact: { artifactId: "fixture", namespace: "research/fixture/outputs", sha256: "a".repeat(64) },
  codeSha256: "b".repeat(64), dataManifestSha256: "c".repeat(64), metricsManifestSha256: "d".repeat(64), validationPlanSha256: "e".repeat(64),
  budget: { allocationId: "fixture-budget", currency: "USD", reservedMinor: 100, consumedMinor: 0 }, idempotencyKey: "fixture-recompute-test-v1",
} satisfies V32PromotionRequest;
const check = (barsCsv = sourceBars, candidateValue = candidate, designValue = design) => recomputeV32SyntheticFixture({ barsCsv, candidate: candidateValue, design: designValue }).checks;
const frozenDecisions = () => {
  const grouped = new Map<string, Array<{ date: string; close: number }>>();
  for (const line of sourceBars.trimEnd().split("\n").slice(1)) {
    const [security, date, , , , , close] = line.split(",");
    const rows = grouped.get(security) ?? [];
    rows.push({ date, close: Number(close) }); grouped.set(security, rows);
  }
  const [start, end] = design.split.test as [number, number];
  return [...grouped].flatMap(([security, rows]) => Array.from({ length: end - start - 1 }, (_, offset) => {
    const index = start + offset;
    const fast = rows.slice(index + 1 - candidate.parameters.fastWindow, index + 1).reduce((sum, row) => sum + row.close, 0) / candidate.parameters.fastWindow;
    const slow = rows.slice(index + 1 - candidate.parameters.slowWindow, index + 1).reduce((sum, row) => sum + row.close, 0) / candidate.parameters.slowWindow;
    return { security, index, date: rows[index].date, targetHeld: fast > slow };
  }));
};

describe("V3.2 independent synthetic fixture recomputation", () => {
  it("verifies frozen fixture identity, eligibility, exact file set and byte hashes", () => {
    expect(() => verifyV32SyntheticFixture({ manifest, files: frozenFiles })).not.toThrow();
    const tampered = { ...frozenFiles, "candidate.json": Buffer.from(`${frozenFiles["candidate.json"]} `) };
    expect(() => verifyV32SyntheticFixture({ manifest, files: tampered })).toThrow("differs from its frozen manifest: candidate.json");
    expect(() => verifyV32SyntheticFixture({ manifest: { ...manifest, usageEligibility: "GENERAL" }, files: frozenFiles })).toThrow("manifest identity or eligibility is invalid");
    expect(() => verifyV32SyntheticFixture({ manifest, files: { ...frozenFiles, "unexpected.csv": Buffer.from("") } })).toThrow("exactly the frozen input files");
  });

  it("recomputes five evidence-bearing gates and applies costs to test-window performance", () => {
    const result = recomputeV32SyntheticFixture({ barsCsv: sourceBars, candidate, design });
    expect(result.checks.map(({ checkId, status }) => [checkId, status])).toEqual([
      ["PIT", "PASS"], ["OUT_OF_SAMPLE", "PASS"], ["COST", "PASS"], ["RULES", "PASS"], ["CAPACITY", "PASS"],
    ]);
    const oos = result.evidence.OUT_OF_SAMPLE as { trades: unknown[]; grossReturn: number; netReturn: number; decisionCount: number };
    const cost = result.evidence.COST as { totalFees: number };
    expect(oos.decisionCount).toBe(70);
    expect(oos.trades.length).toBeGreaterThan(0);
    expect(cost.totalFees).toBeGreaterThan(0);
    expect(oos.netReturn).toBeLessThan(oos.grossReturn);
    expect(result.checks.every(({ evidenceSha256 }) => /^[a-f0-9]{64}$/u.test(evidenceSha256 ?? ""))).toBe(true);
  });

  it("executes candidate decisions as the trade input and independently matches all 70 frozen decisions", () => {
    const decisions = frozenDecisions();
    const result = recomputeV32SyntheticFixture({ barsCsv: sourceBars, candidate, design, candidateExecution: { codeSha256: "9392a720f5e7576f7047b93c212b0d3776e3621a2379e1878a25e93cfb6303ff", decisions } });
    expect(result.checks.map(({ status }) => status)).toEqual(["PASS", "PASS", "PASS", "PASS", "PASS"]);
    expect(result.evidence.RULES).toMatchObject({ candidateDecisionCount: 70, candidateDecisionMatches: 70, candidateSourceExecution: "EXECUTED_IN_ISOLATED_CONTAINER" });
  });

  it("fails rules and OOS for altered, missing, duplicate, or hash-mismatched candidate decisions", () => {
    const decisions = frozenDecisions();
    const evaluate = (rows: typeof decisions, codeSha256 = "9392a720f5e7576f7047b93c212b0d3776e3621a2379e1878a25e93cfb6303ff") => recomputeV32SyntheticFixture({ barsCsv: sourceBars, candidate, design, candidateExecution: { codeSha256, decisions: rows } });
    const changed = [...decisions]; changed[0] = { ...changed[0], targetHeld: !changed[0].targetHeld };
    const altered = evaluate(changed);
    expect(altered.checks.find(({ checkId }) => checkId === "RULES")?.status).toBe("FAIL");
    expect((altered.evidence.RULES as { candidateDecisionMatches: number }).candidateDecisionMatches).toBe(69);
    expect(evaluate(decisions.slice(1)).checks.find(({ checkId }) => checkId === "OUT_OF_SAMPLE")?.status).toBe("FAIL");
    expect(evaluate([...decisions, decisions[0]]).checks.find(({ checkId }) => checkId === "RULES")?.status).toBe("FAIL");
    expect(evaluate(decisions, "0".repeat(64)).checks.find(({ checkId }) => checkId === "RULES")?.status).toBe("FAIL");
  });

  it("fails PIT when a feature timestamp is later than its decision close", () => {
    const line = sourceBars.trimEnd().split("\n")[145];
    const date = line.split(",")[1];
    const future = new Date(`${date}T00:00:00Z`);
    future.setUTCDate(future.getUTCDate() + 1);
    const changed = sourceBars.replace(line, line.replace(`${date}T16:00:00+08:00`, `${future.toISOString().slice(0, 10)}T16:00:00+08:00`));
    expect(check(changed).find(({ checkId }) => checkId === "PIT")?.status).toBe("FAIL");
  });

  it("fails when the candidate algorithm or frozen parameter rules drift", () => {
    expect(check(sourceBars, { ...candidate, algorithm: "UNREGISTERED" }).find(({ checkId }) => checkId === "RULES")?.status).toBe("FAIL");
    expect(check(sourceBars, { ...candidate, parameters: { fastWindow: 20, slowWindow: 5 } }).find(({ checkId }) => checkId === "RULES")?.status).toBe("FAIL");
    expect(check(sourceBars, { ...candidate, sourceCode: "def signal(closes): return True" }).find(({ checkId }) => checkId === "RULES")?.status).toBe("FAIL");
  });

  it("fails capacity when realized next-session volume cannot support the order", () => {
    const changed = sourceBars.replace(/,\d{6}$/gmu, ",10");
    expect(check(changed).find(({ checkId }) => checkId === "CAPACITY")?.status).toBe("FAIL");
  });

  it("rejects non-positive market prices or volume instead of allowing invalid capacity evidence", () => {
    const lines = sourceBars.trimEnd().split("\n");
    const cells = lines[1].split(",");
    cells[7] = "-100";
    lines[1] = cells.join(",");
    expect(() => check(lines.join("\n") + "\n")).toThrow("invalid numeric values");
    const priceLines = sourceBars.trimEnd().split("\n");
    const priceCells = priceLines[1].split(",");
    priceCells[3] = "0";
    priceLines[1] = priceCells.join(",");
    expect(() => check(priceLines.join("\n") + "\n")).toThrow("invalid numeric values");
  });

  it("fails capacity closed when the configured participation limit is invalid", () => {
    const changed = structuredClone(design);
    changed.checks.capacity.maximumParticipation = Number.NaN;
    expect(check(sourceBars, candidate, changed).find(({ checkId }) => checkId === "CAPACITY")?.status).toBe("FAIL");
  });

  it("fails OOS when the frozen windows overlap or do not cover the required test span", () => {
    const changed = structuredClone(design);
    changed.split.validation[1] = 145;
    expect(check(sourceBars, candidate, changed).find(({ checkId }) => checkId === "OUT_OF_SAMPLE")?.status).toBe("FAIL");
  });
});
