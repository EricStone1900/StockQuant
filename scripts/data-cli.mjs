import { createHash } from "node:crypto";

const baseUrl = process.env.MARKET_DATA_URL ?? "http://127.0.0.1:3002";

function argsOf(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    result[item.slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i];
  }
  return result;
}

function required(args, names) {
  for (const name of names) if (!args[name]) throw new Error(`missing --${name}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { "content-type": "application/json", ...(options.headers ?? {}) } });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) { const error = new Error(`${response.status}: ${body.message ?? body.code ?? text}`); error.exitCode = response.status === 409 || response.status === 422 ? 2 : 1; throw error; }
  return body;
}

async function main([command, ...argv]) {
  const args = argsOf(argv);
  if (command === "collect") {
    required(args, ["subscription", "window-start", "window-end", "idempotency-key"]);
    const payload = { subscriptionId: args.subscription, subscriptionVersion: Number(args["subscription-version"] ?? 1), windowStart: args["window-start"], windowEnd: args["window-end"], jobKind: args["job-kind"] ?? "INTRADAY_WINDOW", idempotencyKey: args["idempotency-key"], requestHash: createHash("sha256").update(JSON.stringify(args)).digest("hex") };
    console.log(JSON.stringify(await request("/v2/collection-runs", { method: "POST", body: JSON.stringify(payload) }), null, 2));
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

main(process.argv.slice(2)).catch((error) => { console.error(JSON.stringify({ status: "FAILED", error: String(error) })); process.exitCode = error.exitCode ?? 1; });
