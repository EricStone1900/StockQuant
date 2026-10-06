import test from "node:test";
import assert from "node:assert/strict";
import { collectionSourceConfiguration } from "./dc08a-collection-authorization.mjs";

const complete = {
  STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED: "true",
  STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF: "evidence/source-use-authorization.json",
  STOCKQUANT_COLLECTION_DATA_VERSION: "minute-v1",
  STOCKQUANT_COLLECTION_SOURCES: "sina,baostock",
  STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS: "sina,baostock",
};

test("minute source authorization requires every runtime gate field", () => {
  const result = collectionSourceConfiguration({}, "");
  assert.equal(result.authorized, false);
  assert.deepEqual(result.missingConfiguration, [
    "STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED",
    "STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF",
    "STOCKQUANT_COLLECTION_DATA_VERSION",
    "STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS",
  ]);
});

test("minute source authorization requires every configured source ID", () => {
  assert.equal(collectionSourceConfiguration(complete, "").authorized, true);
  const extended = collectionSourceConfiguration({ ...complete, STOCKQUANT_COLLECTION_SOURCES: "sina,baostock,tdx" }, "");
  assert.equal(extended.authorized, false);
  assert.deepEqual(extended.missingConfiguration, ["STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS"]);
});

test("process environment overrides the local env file including explicit empty values", () => {
  const result = collectionSourceConfiguration({ STOCKQUANT_COLLECTION_DATA_VERSION: "" }, "STOCKQUANT_COLLECTION_DATA_VERSION=local-v1\n");
  assert.equal(result.authorized, false);
  assert.deepEqual(result.missingConfiguration, [
    "STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED",
    "STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF",
    "STOCKQUANT_COLLECTION_DATA_VERSION",
    "STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS",
  ]);
});
