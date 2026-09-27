import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

test("generated TypeScript keeps oneOf readiness gates as discriminated unions", async () => {
  const generated = await readFile(resolve("packages/contracts/generated/types.ts"), "utf8");
  const readiness = generated.match(/export type V24PaperReadiness = \{[\s\S]*?(?=\n\nexport type V24PaperStageRunAccepted)/u)?.[0];
  assert.ok(readiness, "V24PaperReadiness type must be generated");
  assert.match(readiness, /"policyReadiness": \{[\s\S]*?"status": 'BLOCKED'[\s\S]*?\}\s*\|\s*\{[\s\S]*?"status": 'REJECTED'/u);
  assert.match(readiness, /"mandateReadiness": \{[\s\S]*?"status": 'BLOCKED'[\s\S]*?\}\s*\|\s*\{[\s\S]*?"status": 'REJECTED'/u);
  assert.doesNotMatch(readiness, /"(?:policyReadiness|mandateReadiness)": unknown/u);
});
