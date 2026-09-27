import test from "node:test";
import assert from "node:assert/strict";
import { platformMarketDataHeaders } from "./market-data-service-identity.mjs";

test("platform Market Data calls require a dedicated service Bearer credential", () => {
  assert.deepEqual(platformMarketDataHeaders({ env: { STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40) }, file: "/missing/.env.local", extra: { "content-type": "application/json" } }), {
    "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}`,
  });
  assert.throws(() => platformMarketDataHeaders({ env: {}, file: "/missing/.env.local" }), /STOCKQUANT_SERVICE_TOKEN_PLATFORM_API/u);
});
