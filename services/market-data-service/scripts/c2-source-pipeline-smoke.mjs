import assert from "node:assert/strict";
import { spawn, fork } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";

const root = resolve("../..");
const live = process.argv.includes("--live");
const syntheticEpoch = Date.parse("2026-10-21T08:00:00Z");
if (process.argv.includes("--service")) {
  // Harness-only frozen session, advancing with monotonic time. Production
  // clocks and native timeout timers remain unchanged outside this child.
  if (!live) {
    const NativeDate = Date; const started = performance.now();
    globalThis.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [syntheticEpoch + performance.now() - started])); }
      static now() { return syntheticEpoch + performance.now() - started; }
    };
  }
  const original = globalThis.fetch;
  const daily = JSON.parse(await readFile(resolve(root, "fixtures/v2/v2.1-daily-bar-completion/bars.json"), "utf8"));
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    if (url.protocol !== "https:") return original(input, options);
    process.send?.({ event: "SOURCE_REQUEST", host: url.hostname, path: url.pathname, query: url.search });
    if (live) return original(input, options);
    if (url.hostname === "qt.gtimg.cn") {
      const fields = Array(31).fill("0"); fields[1] = "Synthetic"; fields[3] = "10.25";
      // The synthetic time is explicit UTC+08, not the host's local timezone.
      fields[30] = new Date(Date.now() + 8 * 3600_000).toISOString().replace(/[-:TZ.]/gu, "").slice(0, 14);
      return new Response(["sh600000", "sz000001"].map((code) => `v_${code}="${fields.join("~")}";`).join("\n"));
    }
    if (url.hostname === "push2his.eastmoney.com") {
      const code = url.searchParams.get("secid").split(".")[1];
      const bar = daily.bars.find((row) => row.securityId.startsWith(code));
      const date = url.searchParams.get("beg").replace(/(\d{4})(\d{2})(\d{2})/u, "$1-$2-$3");
      return new Response(JSON.stringify({ data: { code, klines: [`${date},${bar.open},${bar.close},${bar.high},${bar.low},${bar.volume / 100},${bar.amount}`] } }));
    }
    if (url.hostname === "finance.eastmoney.com") return new Response(url.pathname === "/" ? '<a href="/a/123.html">synthetic listing</a>' : '<title>Synthetic notice A</title>');
    if (url.hostname === "www.cls.cn") return new Response(url.pathname === "/" ? '<a href="/detail/123">synthetic listing</a>' : '<title>Synthetic notice B</title>');
    throw new Error("UNEXPECTED_EXTERNAL_REQUEST");
  };
  await import("../dist/bootstrap/main.js");
} else {
  assert.ok(process.env.STOCKQUANT_ISOLATED_PG_CONTAINER?.startsWith("sq-test-postgres-"));
  assert.ok(process.env.MARKET_DATA_DATABASE_URL && process.env.MARKET_MONITOR_DATABASE_URL);
  const testRunId = randomUUID();
  const token = randomBytes(32).toString("hex"); const monitorToken = randomBytes(32).toString("hex");
  const requests = []; const children = []; const assertions = [];
  async function port() { const server = createServer(); server.listen(0, "127.0.0.1"); await once(server, "listening"); const selected = server.address().port; await new Promise((done) => server.close(done)); return selected; }
  const apiPort = await port(); const monitorPort = await port();
  const base = `http://127.0.0.1:${apiPort}`; const monitorBase = `http://127.0.0.1:${monitorPort}`;
  const env = { PATH: process.env.PATH, STOCKQUANT_PROJECT_ROOT: root, STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_DATABASE_URL: process.env.MARKET_DATA_DATABASE_URL,
    STOCKQUANT_PORT: String(apiPort), STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: token,
    STOCKQUANT_MARKET_MONITOR_URL: monitorBase, STOCKQUANT_SERVICE_TOKEN_MARKET_MONITOR: monitorToken,
    STOCKQUANT_SAMPLING_TASK_WORKER_INTERVAL_MS: "100", STOCKQUANT_DAILY_BAR_WORKER_INTERVAL_MS: "100", STOCKQUANT_MONITOR_OUTBOX_INTERVAL_MS: "100",
    STOCKQUANT_DAILY_BAR_WORKER_RETRY_DELAY_MS: "0", STOCKQUANT_SAMPLING_TASK_RETRY_DELAY_MS: "0",
    STOCKQUANT_SNAPSHOT_REAL_PROVIDER_ENABLED: "true", STOCKQUANT_SNAPSHOT_SCHEDULER_ENABLED: "true",
    STOCKQUANT_DAILY_REAL_PROVIDER_ENABLED: "true", STOCKQUANT_DAILY_BAR_SOURCE_MODE: "REAL",
    STOCKQUANT_DAILY_BAR_SCHEDULER: "0", STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0", STOCKQUANT_ARTIFACT_TASK_EXECUTOR: "0" };
  for (const [purpose, ids] of [["QUOTE", "tencent-quote"], ["NEWS", "eastmoney-news,cls-news"], ["DAILY", "eastmoney-daily"]]) Object.assign(env, {
    [`STOCKQUANT_MARKET_${purpose}_SOURCE_USE_AUTHORIZED`]: "true", [`STOCKQUANT_MARKET_${purpose}_SOURCE_AUTHORIZATION_REF`]: "OD-008-C2-local-learning-2026-10-21",
    [`STOCKQUANT_MARKET_${purpose}_DATA_VERSION`]: "c2-local-learning-2026-10-21", [`STOCKQUANT_MARKET_${purpose}_AUTHORIZED_SOURCE_IDS`]: ids,
  });
  let diagnostics = ""; let service;
  function capture(child) { children.push(child); child.stderr?.on("data", (value) => { diagnostics = (diagnostics + value).slice(-6000); }); child.on("message", (value) => requests.push(value)); return child; }
  async function ready(url, child) {
    for (let i = 0; i < 100; i++) { if (child.exitCode !== null) throw new Error(diagnostics); try { if ((await fetch(url)).ok) return; } catch {} await delay(100); }
    throw new Error(`readiness failed: ${url} ${diagnostics}`);
  }
  async function stop(child) { if (child.exitCode !== null || child.signalCode !== null) return; child.kill("SIGTERM"); await Promise.race([once(child, "exit"), delay(2000)]); if (child.exitCode === null && child.signalCode === null) { const exited = once(child, "exit"); child.kill("SIGKILL"); await exited; } }
  async function startService() { service = capture(fork(fileURLToPath(import.meta.url), ["--service", ...(live ? ["--live"] : [])], { env, stdio: ["ignore", "ignore", "pipe", "ipc"] })); await ready(`${base}/ready`, service); }
  async function api(path, method = "GET", body) { const response = await fetch(base + path, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: response.status, body: await response.json() }; }
  async function terminal(path, field, states) { for (let i = 0; i < 120; i++) { const response = await api(path); if (states.includes(response.body?.[field]?.state ?? response.body?.[field]?.status)) return response.body; await delay(100); } throw new Error(`task timeout ${diagnostics}`); }
  const pool = new Pool({ connectionString: process.env.MARKET_DATA_DATABASE_URL });
  const report = { status: "FAIL", testRunId, dataMode: live ? "LIVE_SOURCE" : "SYNTHETIC_HTTP_REAL_SERVICES", humanAcceptance: "NOT_RUN", assertions, sourceRequests: requests, environment: { host: process.platform, arch: process.arch, node: process.version, isolatedPostgres: process.env.STOCKQUANT_ISOLATED_PG_CONTAINER }, limitations: [] };
  try {
    const monitor = capture(spawn(resolve(root, "services/market-monitor-service/.venv/bin/python"), ["-m", "stockquant_market_monitor.main"], { cwd: resolve(root, "services/market-monitor-service"), env: { PATH: process.env.PATH, PYTHONPATH: resolve(root, "services/market-monitor-service/src"), STOCKQUANT_DATABASE_URL: process.env.MARKET_MONITOR_DATABASE_URL, STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: token, STOCKQUANT_SERVICE_TOKEN_MARKET_DATA: monitorToken, STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(monitorPort) }, stdio: ["ignore", "ignore", "pipe"] }));
    await ready(`${monitorBase}/live`, monitor); await startService();
    const scope = { market: "CN_A", ownerId: "acceptance-owner-1", accountId: randomUUID(), namespace: `c2-pipeline-${testRunId}`, testRunId };
    const query = new URLSearchParams(scope);
    const { market: _market, ...watchlistScope } = scope;
    const savedPool = await api("/v2/watchlist/scoped", "PUT", { ...watchlistScope, holdings: [], inFlightOrders: [], candidates: ["600000.SH", "000001.SZ"] });
    assert.equal(savedPool.status, 200, JSON.stringify(savedPool.body));
    await api("/v2/sampling/monitor-policy", "PUT", { enabled: true });
    const localDate = new Date((live ? Date.now() : syntheticEpoch) + 8 * 3600_000).toISOString().slice(0, 10);
    const scheduledAt = `${localDate}T09:30:00+08:00`;
    const queued = await api("/v2/sampling/tasks/tick", "POST", { scope, sourceId: "tencent-quote", scheduledAt }); assert.equal(queued.status, 200);
    assert.ok(queued.body.task, "current session must be covered by the calendar");
    const snapshot = await terminal(`/v2/sampling/tasks/latest?${query}`, "task", ["COMPLETED_REAL", "FAILED"]);
    assert.equal(snapshot.task.status, "COMPLETED_REAL"); assert.equal(snapshot.task.observations.length, 2);
    assertions.push({ id: "REAL_WORKER_PERSISTENCE", status: "PASS", taskId: snapshot.task.taskId, freshness: snapshot.task.observations.map((row) => row.freshness) });
    for (let i = 0; i < 80; i++) {
      const response = await fetch(`${monitorBase}/v1/quote-quality/latest?${query}`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` } });
      assert.equal(response.status, 200, "Monitor read requires explicit Platform service identity");
      const quality = (await response.json()).quality;
      if (quality?.taskId === snapshot.task.taskId) {
        const freshCount = snapshot.task.observations.filter((row) => row.freshness === "FRESH" && row.status === "READY").length;
        assert.equal(quality.freshCount, freshCount); assert.equal(quality.status, freshCount === 0 ? "UNAVAILABLE" : freshCount === 2 ? "READY" : "PARTIAL");
        assertions.push({ id: "REAL_MONITOR_OUTBOX", status: "PASS", evaluationId: quality.evaluationId, qualityStatus: quality.status, freshCount }); break;
      }
      await delay(100);
    }
    assert.ok(assertions.some((row) => row.id === "REAL_MONITOR_OUTBOX"));
    const countBefore = requests.length;
    const repeated = await api("/v2/sampling/tasks/tick", "POST", { scope, sourceId: "tencent-quote", scheduledAt }); assert.equal(repeated.body.task.taskId, snapshot.task.taskId); assert.equal(repeated.body.task.created, false);
    await delay(200); assert.equal(requests.length, countBefore); assertions.push({ id: "REPEATED_TICK_ZERO_REQUESTS", status: "PASS" });
    const daily = await api("/v2/daily-bars/real/complete", "POST", { scope }); assert.equal(daily.status, 200);
    const completed = await terminal(`/v2/daily-bars/completions/latest?${query}`, "task", ["COMPLETED", "FAILED"]);
    assert.equal(completed.task.state, "COMPLETED", completed.task.lastError); assert.equal(completed.completion.status, "COMPLETED_REAL"); assert.equal(completed.completion.bars.length, 2); assert.equal(completed.task.fixtureVersion, null);
    assertions.push({ id: "INDEPENDENT_REAL_DAILY_BARS", status: "PASS", taskId: completed.task.taskId, completionId: completed.completion.completionId, sourceId: completed.completion.sourceId, sessionDate: completed.completion.sessionDate, barsSha256: createHash("sha256").update(JSON.stringify(completed.completion.bars)).digest("hex") });
    const news = await api("/v2/news/live"); assert.equal(news.body.status, "PASS"); assert.equal(news.body.items.length, 2);
    const afterNews = requests.length;
    assert.equal((await api("/v2/sources/eastmoney-news/fail", "POST")).status, 200);
    const inventory = await api("/v2/sources"); assert.equal(inventory.body.sources.find((source) => source.sourceId === "eastmoney-news").circuit, "OPEN");
    const partial = await api("/v2/news/live"); assert.equal(partial.body.status, "PARTIAL"); assert.deepEqual(partial.body.sourceFailures, ["eastmoney-news"]); assert.equal(partial.body.sourceErrors[0].code, "SOURCE_CIRCUIT_OPEN"); assert.equal(requests.length, afterNews);
    assertions.push({ id: "CIRCUIT_AND_CACHE_ZERO_REQUESTS", status: "PASS", persistedArticles: Number((await pool.query("SELECT count(*) FROM market_data_news_revisions")).rows[0].count) });
    // Registration is durable; stop it before any next real-time sampling slot.
    assert.equal((await api("/v2/sampling/schedules", "PUT", { scope, sourceId: "tencent-quote", enabled: true })).status, 200);
    assert.equal((await api("/v2/sampling/schedules", "PUT", { scope, sourceId: "tencent-quote", enabled: false })).status, 200);
    await stop(service); await startService();
    const restored = await api(`/v2/daily-bars/completions/latest?${query}`); assert.equal(restored.body.completion.completionId, completed.completion.completionId);
    assert.equal((await api(`/v2/sampling/tasks/latest?${query}`)).body.task.taskId, snapshot.task.taskId);
    assertions.push({ id: "SERVICE_RESTART_PERSISTENCE", status: "PASS" });
    report.status = "PASS";
  } catch (error) { report.failure = error instanceof Error ? error.message : String(error); }
  finally { for (const child of children.reverse()) await stop(child); await pool.end(); }
  report.codeSha256 = Object.fromEntries(await Promise.all(["scripts/c2-source-pipeline-smoke.mjs", "src/bootstrap/main.ts", "src/adapters/eastmoney-daily-bar-provider.ts", "src/adapters/postgres-daily-bar-completion-repository.ts"].map(async (path) => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
  report.externalRequests = live ? requests.length : 0;
  if (!live) report.transformation = "Injected HTTP quotes use the test process instant; independent daily OHLCV copied from v2.1-daily-bars-1 and date relabelled to the test session; news HTML is synthetic. Provider HTTP alone is substituted; production workers, HTTP services and isolated PostgreSQL are real.";
  const directory = resolve(root, "evidence/local/V2.1", testRunId); await mkdir(directory, { recursive: true });
  const bytes = JSON.stringify(report, null, 2) + "\n"; await writeFile(resolve(directory, "source-pipeline.json"), bytes, { flag: "wx" }); await writeFile(resolve(directory, "manifest.sha256"), createHash("sha256").update(bytes).digest("hex") + "  source-pipeline.json\n", { flag: "wx" });
  console.log(JSON.stringify({ status: report.status, evidenceDirectory: directory, assertions, failure: report.failure, externalRequests: report.externalRequests }));
  process.exitCode = report.status === "PASS" ? 0 : 1;
}
