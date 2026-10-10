import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { parseSeedPaperArgs, seedPaperMarkets, seedV13PaperAccounts } from "./seed-paper-core.mjs";

const runId = "123e4567-e89b-42d3-a456-426614174000";
const ownerId = "acceptance-owner-1";

async function mockApi({ stageId = "V1.3", status = "WAITING" } = {}) {
  const initialized = new Map();
  const requests = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    requests.push({ method: request.method, path: url.pathname, cookie: request.headers.cookie });
    response.setHeader("content-type", "application/json");
    if (request.headers.cookie !== "sq_session=valid-test-session") { response.writeHead(401).end(JSON.stringify({ message: "unauthorized" })); return; }
    if (url.pathname === `/api/v1/acceptance/v1/v1.3/runs/${runId}` && request.method === "GET") {
      response.end(JSON.stringify({ testRunId: runId, stageId, ownerId, status, assertions: [{ assertionId: "seed-only", status: "WAITING" }] }));
      return;
    }
    if (url.pathname === `/api/v1/acceptance/v1/v1.3/runs/${runId}/accounts` && request.method === "POST") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const spec = seedPaperMarkets.find((item) => item.market === body.market);
      if (!spec) { response.writeHead(422).end(JSON.stringify({ message: "unknown market" })); return; }
      const replayed = initialized.has(spec.market);
      if (!replayed) initialized.set(spec.market, `00000000-0000-4000-8000-${spec.market === "CN_A" ? "000000000001" : "000000000002"}`);
      response.writeHead(201).end(JSON.stringify({
        linkedTestRunId: runId, ownerId, environmentMode: "PAPER", brokerMode: "FAKE", replayed,
        account: { accountId: initialized.get(spec.market), ownerId, testRunId: runId, market: spec.market, environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: spec.initialCash, currency: spec.currency } },
      }));
      return;
    }
    response.writeHead(404).end(JSON.stringify({ message: "not found" }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  return { server, apiUrl: `http://127.0.0.1:${address.port}`, requests, initialized };
}

test("seed:paper requires an explicit V1.3 TestRun and rejects unknown arguments", () => {
  assert.deepEqual(parseSeedPaperArgs(["--stage", "V1.3", "--run", runId]), { stage: "V1.3", runId });
  assert.throws(() => parseSeedPaperArgs(["--run", runId]), /only --stage V1.3/);
  assert.throws(() => parseSeedPaperArgs(["--stage", "V2.4", "--run", runId]), /only --stage V1.3/);
  assert.throws(() => parseSeedPaperArgs(["--stage", "V1.3", "--run", runId, "--reset"]), /usage:/);
});

test("seed:paper initializes only the two V1 markets idempotently without order or Fill routes", async (t) => {
  const api = await mockApi();
  t.after(() => api.server.close());
  const input = { apiUrl: api.apiUrl, sessionCookie: "sq_session=valid-test-session", runId };
  const first = await seedV13PaperAccounts(input);
  const second = await seedV13PaperAccounts(input);
  assert.equal(first.environmentMode, "PAPER");
  assert.equal(first.brokerMode, "FAKE");
  assert.deepEqual(first.markets.map(({ market }) => market), ["CN_A", "US_EQUITY"]);
  assert.deepEqual(second.markets.map(({ replayed }) => replayed), [true, true]);
  assert.equal(first.businessOrdersCreated, 0);
  assert.equal(first.businessFillsCreated, 0);
  assert.equal(api.initialized.size, 2);
  assert.equal(api.requests.filter(({ method }) => method === "POST").length, 4);
  assert.equal(api.requests.some(({ path }) => /orders|fills/iu.test(path)), false);
  assert.equal(api.requests.every(({ cookie }) => cookie === "sq_session=valid-test-session"), true);
});

test("seed:paper fails closed on non-loopback targets, missing session, wrong stage, or started run", async (t) => {
  await assert.rejects(() => seedV13PaperAccounts({ apiUrl: "https://example.com", sessionCookie: "sq_session=x", runId }), /loopback/);
  await assert.rejects(() => seedV13PaperAccounts({ apiUrl: "http://127.0.0.1:3000", sessionCookie: "", runId }), /STOCKQUANT_SESSION_COOKIE/);

  const wrongStage = await mockApi({ stageId: "V2.4" });
  t.after(() => wrongStage.server.close());
  await assert.rejects(() => seedV13PaperAccounts({ apiUrl: wrongStage.apiUrl, sessionCookie: "sq_session=valid-test-session", runId }), /WAITING TestRun/);
  assert.equal(wrongStage.requests.some(({ method }) => method === "POST"), false);

  const started = await mockApi({ status: "COMPLETED" });
  t.after(() => started.server.close());
  await assert.rejects(() => seedV13PaperAccounts({ apiUrl: started.apiUrl, sessionCookie: "sq_session=valid-test-session", runId }), /WAITING TestRun/);
  assert.equal(started.requests.some(({ method }) => method === "POST"), false);
});
