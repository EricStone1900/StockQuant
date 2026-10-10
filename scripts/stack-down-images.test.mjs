import assert from "node:assert/strict";
import test from "node:test";
import { removeIsolatedProjectImages } from "./remove-isolated-project-images.mjs";

const project = "sq-v11-stack-0123456789abcdef0123";

test("removes and verifies only image tags owned by the exact isolated project", () => {
  const calls = [];
  const run = (command, args) => {
    calls.push([command, args]);
    if (args[1] === "ls" && args.includes("--format")) return { status: 0, stdout: `${project}-web:latest\n${project}-platform-api-service:latest\n`, stderr: "" };
    if (args[1] === "rm") return { status: 0, stdout: "untagged", stderr: "" };
    if (args[1] === "ls" && args.includes("-q")) return { status: 0, stdout: "", stderr: "" };
    throw new Error(`unexpected Docker command: ${args.join(" ")}`);
  };

  const result = removeIsolatedProjectImages(project, run);
  assert.deepEqual(result, { status: 0, removed: [`${project}-web:latest`, `${project}-platform-api-service:latest`] });
  assert.deepEqual(calls[1][1], ["image", "rm", `${project}-web:latest`, `${project}-platform-api-service:latest`]);
  assert.deepEqual(calls[2][1], ["image", "ls", "-q", "--filter", `reference=${project}-*`]);
});

test("succeeds when an isolated project owns no remaining image tags", () => {
  const calls = [];
  const run = (_command, args) => { calls.push(args); return { status: 0, stdout: "", stderr: "" }; };
  assert.deepEqual(removeIsolatedProjectImages(project, run), { status: 0, removed: [] });
  assert.equal(calls.length, 2);
});

test("rejects invalid project names and image-filter results outside the project", () => {
  assert.equal(removeIsolatedProjectImages("stockquant").status, 2);
  const result = removeIsolatedProjectImages(project, (_command, args) => args.includes("--format")
    ? { status: 0, stdout: "unrelated:latest", stderr: "" }
    : { status: 0, stdout: "", stderr: "" });
  assert.equal(result.status, 1);
  assert.match(result.error, /outside the isolated project/u);
});

test("keeps the cleanup retryable when Docker fails to remove a project image", () => {
  const result = removeIsolatedProjectImages(project, (_command, args) => args[1] === "ls" && args.includes("--format")
    ? { status: 0, stdout: `${project}-web:latest\n`, stderr: "" }
    : { status: 1, stdout: "", stderr: "image is in use" });
  assert.equal(result.status, 1);
  assert.match(result.error, /image is in use/u);
});
