import { isIP } from "node:net";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MARKETS = [
  { market: "CN_A", currency: "CNY", initialCash: "10000.0000" },
  { market: "US_EQUITY", currency: "USD", initialCash: "10000.0000" },
];

export function parseSeedPaperArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (name === "--help" || name === "-h") return { help: true };
    if (!["--stage", "--run"].includes(name) || values.has(name) || !args[index + 1] || args[index + 1].startsWith("--")) {
      throw new Error("usage: pnpm seed:paper -- --stage V1.3 --run <TestRun UUID>");
    }
    values.set(name, args[++index]);
  }
  const stage = values.get("--stage");
  const runId = values.get("--run");
  if (stage !== "V1.3" || !UUID.test(runId ?? "")) {
    throw new Error("seed:paper currently supports only --stage V1.3 and requires an existing TestRun UUID");
  }
  return { stage, runId };
}

function loopbackBaseUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("STOCKQUANT_PLATFORM_API_URL must be a valid loopback HTTP URL"); }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  const loopback = hostname === "localhost" || hostname === "::1" || (isIP(hostname) === 4 && hostname.startsWith("127."));
  if (url.protocol !== "http:" || !loopback || url.username || url.password || url.search || url.hash || (url.pathname !== "" && url.pathname !== "/")) {
    throw new Error("seed:paper only accepts a loopback HTTP API URL without credentials or extra path components");
  }
  return url.origin;
}

function decodeCookie(raw) {
  if (typeof raw !== "string" || !/^sq_session=[^;\s]+$/u.test(raw) || /[\r\n]/u.test(raw)) {
    throw new Error("STOCKQUANT_SESSION_COOKIE must contain only the current sq_session=<token> cookie");
  }
  return raw;
}

async function readJson(response, label) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}`);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(`${label} returned an invalid JSON object`);
  return body;
}

function assertRun(run, runId) {
  if (run.testRunId !== runId || run.stageId !== "V1.3" || typeof run.ownerId !== "string" || run.status !== "WAITING") {
    throw new Error("seed:paper requires an owner-scoped V1.3 WAITING TestRun; no account request was sent");
  }
  if (!Array.isArray(run.assertions) || run.assertions.some((item) => item?.status !== "WAITING")) {
    throw new Error("seed:paper refuses a TestRun with business assertions already started");
  }
}

function assertAccount(body, run, market) {
  const snapshot = body.account;
  const expected = MARKETS.find((item) => item.market === market);
  if (body.linkedTestRunId !== run.testRunId || body.ownerId !== run.ownerId || body.environmentMode !== "PAPER" || body.brokerMode !== "FAKE"
    || snapshot?.testRunId !== run.testRunId || snapshot?.ownerId !== run.ownerId || snapshot?.market !== expected.market
    || snapshot?.environmentMode !== "PAPER" || snapshot?.brokerMode !== "FAKE"
    || snapshot?.cash?.currency !== expected.currency || snapshot?.cash?.amount !== expected.initialCash
    || !UUID.test(snapshot?.accountId ?? "") || typeof body.replayed !== "boolean") {
    throw new Error(`seed:paper returned an unexpected ${market} account projection`);
  }
  return { market, accountId: snapshot.accountId, currency: expected.currency, initialCash: expected.initialCash, replayed: body.replayed };
}

export async function seedV13PaperAccounts({ apiUrl, sessionCookie, runId, fetchImpl = fetch }) {
  if (!UUID.test(runId ?? "")) throw new Error("--run must be a TestRun UUID");
  const baseUrl = loopbackBaseUrl(apiUrl);
  const cookie = decodeCookie(sessionCookie);
  const headers = { cookie, "content-type": "application/json" };
  const runResponse = await fetchImpl(`${baseUrl}/api/v1/acceptance/v1/v1.3/runs/${encodeURIComponent(runId)}`, { headers, signal: AbortSignal.timeout(10_000) });
  const run = await readJson(runResponse, "V1.3 TestRun read");
  assertRun(run, runId);

  const accounts = [];
  for (const item of MARKETS) {
    const response = await fetchImpl(`${baseUrl}/api/v1/acceptance/v1/v1.3/runs/${encodeURIComponent(runId)}/accounts`, {
      method: "POST", headers, body: JSON.stringify({ market: item.market }), signal: AbortSignal.timeout(10_000),
    });
    const body = await readJson(response, `${item.market} account initialization`);
    accounts.push(assertAccount(body, run, item.market));
  }
  const afterResponse = await fetchImpl(`${baseUrl}/api/v1/acceptance/v1/v1.3/runs/${encodeURIComponent(runId)}`, { headers, signal: AbortSignal.timeout(10_000) });
  const after = await readJson(afterResponse, "V1.3 TestRun post-seed read");
  assertRun(after, runId);
  if (JSON.stringify(after.assertions) !== JSON.stringify(run.assertions)) throw new Error("seed:paper changed TestRun business assertions");
  return { stageId: "V1.3", testRunId: runId, environmentMode: "PAPER", brokerMode: "FAKE", markets: accounts, businessOrdersCreated: 0, businessFillsCreated: 0 };
}

export const seedPaperMarkets = MARKETS.map(({ market, currency, initialCash }) => ({ market, currency, initialCash }));
