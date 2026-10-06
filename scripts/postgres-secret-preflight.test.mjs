import test from "node:test";
import assert from "node:assert/strict";
import { postgresSecretKeys, postgresSecretProblems, privateFileMode } from "./postgres-secret-preflight.mjs";

function envWithValues(values) {
  return postgresSecretKeys.map((key) => `${key}=${values[key] ?? ""}`).join("\n");
}

test("postgres secret preflight accepts distinct 32-byte hex credentials", () => {
  const values = Object.fromEntries(postgresSecretKeys.map((key, index) => [key, index.toString(16).padStart(2, "0").repeat(32)]));
  assert.deepEqual(postgresSecretProblems(envWithValues(values)), []);
});

test("postgres secret preflight rejects missing or malformed credentials by name only", () => {
  const values = Object.fromEntries(postgresSecretKeys.map((key) => [key, "a".repeat(64)]));
  values[postgresSecretKeys[2]] = "short";
  const problems = postgresSecretProblems(envWithValues(values));
  assert.ok(problems.includes(postgresSecretKeys[2]));
  assert.ok(problems.some((problem) => problem.includes("must differ")));
  assert.equal(problems.some((problem) => problem.includes("a".repeat(64))), false);
});

test("postgres secret preflight accepts quoted dotenv values", () => {
  const values = Object.fromEntries(postgresSecretKeys.map((key, index) => [key, index.toString(16).padStart(2, "0").repeat(32)]));
  const env = postgresSecretKeys.map((key) => `${key}='${values[key]}'`).join("\n");
  assert.deepEqual(postgresSecretProblems(env), []);
});

test("postgres secret preflight accepts owner-only files and rejects group/world access", () => {
  assert.equal(privateFileMode(0o600), true);
  assert.equal(privateFileMode(0o400), true);
  assert.equal(privateFileMode(0o640), false);
  assert.equal(privateFileMode(0o604), false);
});
