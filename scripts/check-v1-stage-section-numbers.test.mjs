import assert from "node:assert/strict";
import test from "node:test";
import { findDuplicateStageSectionNumbers } from "./check-v1-stage-section-numbers.mjs";

test("finds repeated V1 stage section numbers and reports both locations", () => {
  const markdown = "### 8.1 Setup\n\n### 8.2 Run\n\n### 8.1 Recovery";
  assert.deepEqual(findDuplicateStageSectionNumbers(markdown), [{ number: "8.1", firstLine: 1, line: 5 }]);
});

test("ignores numbered headings inside fenced code examples", () => {
  const markdown = "### 8.1 Setup\n\n```md\n### 8.1 example only\n```\n\n### 8.2 Run";
  assert.deepEqual(findDuplicateStageSectionNumbers(markdown), []);
});

test("accepts unique subsection numbers", () => {
  assert.deepEqual(findDuplicateStageSectionNumbers("### 8.1 Setup\n### 8.2 Run"), []);
});

test("does not treat a nested section such as 8.9.1 as a duplicate of 8.9", () => {
  assert.deepEqual(findDuplicateStageSectionNumbers("### 8.9 Parent\n### 8.9.1 Child"), []);
});
