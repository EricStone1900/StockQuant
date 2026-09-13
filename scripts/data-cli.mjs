import { createHash } from "node:crypto";

const baseUrl = process.env.MARKET_DATA_URL ?? "http://127.0.0.1:3002";

function argsOf(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--" || !item.startsWith("--")) continue;
    result[item.slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i];
  }
  return result;
}

export { argsOf };

function required(args, names) {
  for (const name of names) if (!args[name]) throw new Error(`missing --${name}`);
}

async function request(path, options = {}) {
  const timeoutMs = Number(options.timeoutMs ?? process.env.DATA_CLI_TIMEOUT_MS ?? 10000);
  const { timeoutMs: _timeout, ...fetchOptions } = options;
  const response = await fetch(`${baseUrl}${path}`, { ...fetchOptions, signal: AbortSignal.timeout(timeoutMs), headers: { "content-type": "application/json", ...(fetchOptions.headers ?? {}) } });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) { const error = new Error(`${response.status}: ${body.message ?? body.code ?? text}`); error.exitCode = response.status === 409 || response.status === 422 ? 2 : 1; throw error; }
  return body;
}

async function waitForRun(runId, waitSeconds) {
  const deadline = Date.now() + Math.max(0, Number(waitSeconds)) * 1000;
  let latest;
  do {
    latest = await request(`/v2/collection-runs/${encodeURIComponent(runId)}`);
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(latest.status)) return latest;
    if (Date.now() >= deadline) return latest;
    await new Promise((resolve) => setTimeout(resolve, Math.min(1000, Math.max(1, deadline - Date.now()))));
  } while (Date.now() < deadline);
  return latest;
}

export { waitForRun };

async function main([command, ...argv]) {
  const args = argsOf(argv);
  if (command === "collect") {
    required(args, ["subscription", "window-start", "window-end", "idempotency-key"]);
    const payload = { subscriptionId: args.subscription, subscriptionVersion: Number(args["subscription-version"] ?? 1), windowStart: args["window-start"], windowEnd: args["window-end"], jobKind: args["job-kind"] ?? "INTRADAY_WINDOW", idempotencyKey: args["idempotency-key"], requestHash: createHash("sha256").update(JSON.stringify(args)).digest("hex") };
    const result = await request("/v2/collection-runs", { method: "POST", body: JSON.stringify(payload) });
    const run = result.run ?? result;
    const waited = args["wait-seconds"] === undefined ? run : await waitForRun(run.runId, args["wait-seconds"]);
    console.log(JSON.stringify({ ...result, run: waited, waitCompleted: ["COMPLETED", "FAILED", "CANCELLED"].includes(waited.status) }, null, 2));
    if (args["wait-seconds"] !== undefined && !["COMPLETED", "FAILED", "CANCELLED"].includes(waited.status)) process.exitCode = 2;
    return;
  }
  if (command === "status") {
    required(args, ["run"]);
    console.log(JSON.stringify(await request(`/v2/collection-runs/${encodeURIComponent(args.run)}`), null, 2));
    return;
  }
  if (command === "resume") {
    required(args, ["run", "expected-version"]);
    console.log(JSON.stringify(await request(`/v2/collection-runs/${encodeURIComponent(args.run)}/resume`, { method: "POST", body: JSON.stringify({ expectedVersion: Number(args["expected-version"]) }) }), null, 2));
    return;
  }
  if (command === "backfill") {
    required(args, ["subscription", "from", "to", "idempotency-key"]);
    console.log(JSON.stringify(await request("/v2/minute/backfills", { method: "POST", body: JSON.stringify({ subscriptionId: args.subscription, fromDate: args.from, toDate: args.to, idempotencyKey: args["idempotency-key"] }) }), null, 2));
    return;
  }
  if (command === "schedule") {
    required(args, ["subscription", "action"]);
    const action = args.action;
    if (!["enable", "disable", "status"].includes(action)) throw new Error("--action must be enable, disable, or status");
    const path = `/v2/collection-schedules/${encodeURIComponent(args.subscription)}${action === "status" ? "" : `/${action}`}`;
    console.log(JSON.stringify(await request(path, action === "status" ? {} : { method: "POST", body: "{}" }), null, 2));
    return;
  }
  throw new Error("usage: pnpm data:collect|data:status|data:resume|data:backfill|data:schedule -- ...");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((error) => { console.error(JSON.stringify({ status: "FAILED", error: String(error) })); process.exitCode = error.exitCode ?? 1; });
}
