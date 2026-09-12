import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const compose = ["compose", "-f", "infra/compose/docker-compose.yml"];
const defaultSecurityIds = ["600000.SH", "600004.SH", "600006.SH", "600007.SH", "600008.SH", "600009.SH", "600010.SH", "600011.SH", "600012.SH", "600015.SH", "600016.SH", "600017.SH", "600018.SH", "600019.SH", "600020.SH", "600021.SH", "600022.SH", "600023.SH", "600025.SH", "600026.SH"];

export function promotionConfig(env = process.env) {
  return {
    shortId: env.DC08A_SHORT_SUBSCRIPTION_ID ?? "dc08a-20260914-short-v1",
    targetId: env.DC08A_20_SUBSCRIPTION_ID ?? "dc08a-20260917-20-v1",
    fromDate: env.DC08A_20_FROM_DATE ?? "2026-09-17",
    toDate: env.DC08A_20_TO_DATE ?? "2026-12-31",
    calendarVersion: env.DC08A_CALENDAR_VERSION ?? "sse-cn-a-share-2026-1",
    securityIds: (env.DC08A_20_SECURITY_IDS ?? defaultSecurityIds.join(",")).split(",").map((item) => item.trim()).filter(Boolean),
    acceptanceDates: (env.DC08A_PROMOTION_DATES ?? "2026-09-14,2026-09-15").split(",").map((item) => item.trim()).filter(Boolean),
  };
}

export function evaluatePromotion({ schedules, reports, config }) {
  const enabled = schedules.filter((schedule) => schedule.enabled);
  const short = schedules.find((schedule) => schedule.subscriptionId === config.shortId);
  const target = schedules.find((schedule) => schedule.subscriptionId === config.targetId);
  const alreadyPromoted = enabled[0]?.subscriptionId === config.targetId;
  const reasons = [];
  if (enabled.length !== 1) reasons.push(`expected exactly one enabled subscription, found ${enabled.length}`);
  if (enabled[0] && enabled[0].subscriptionId !== config.shortId && enabled[0].subscriptionId !== config.targetId) reasons.push("enabled subscription is neither the approved short observation nor the target 20-security subscription");
  if (!short && !alreadyPromoted) reasons.push("approved short observation subscription is missing");
  if (target && (target.fromDate !== config.fromDate || target.toDate !== config.toDate || target.calendarVersion !== config.calendarVersion)) reasons.push("target subscription window or calendar does not match the frozen promotion parameters");
  if (reports.some((report) => report?.status !== "PASS")) reasons.push("all required short-observation daily reports must be PASS");
  if (config.securityIds.length !== 20) reasons.push(`target security universe must contain exactly 20 securities, found ${config.securityIds.length}`);
  return { ok: reasons.length === 0, reasons, alreadyPromoted };
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { "content-type": "application/json", ...(options.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

function run(args, options) {
  const result = spawnSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...options });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

async function loadReport(outputDir, date) {
  try { return JSON.parse(await readFile(`${outputDir}/daily-report-${date}.json`, "utf8")); } catch { return { status: "NOT_RUN", date }; }
}

export async function promote({ env = process.env, baseUrl = env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002", outputDir = env.DC08A_OUTPUT_DIR ?? "evidence/dc08a", checkOnly = false, requestFn = request, command = run } = {}) {
  const config = promotionConfig(env);
  const schedules = [];
  for (const id of [config.shortId, config.targetId]) {
    try { schedules.push(await requestFn(baseUrl, `/v2/collection-schedules/${encodeURIComponent(id)}`)); } catch (error) { if (!String(error).includes("HTTP 404")) return { status: "BLOCKED", reasons: [String(error)], exitCode: 2 }; }
  }
  const reports = await Promise.all(config.acceptanceDates.map((date) => loadReport(outputDir, date)));
  const decision = evaluatePromotion({ schedules, reports, config });
  if (!decision.ok) return { status: "BLOCKED", reasons: decision.reasons, exitCode: 2 };
  if (decision.alreadyPromoted) return { status: "ALREADY_PROMOTED", subscriptionId: config.targetId, securityCount: config.securityIds.length, exitCode: 0 };
  if (checkOnly) return { status: "READY_TO_PROMOTE", subscriptionId: config.targetId, securityCount: config.securityIds.length, exitCode: 0 };
  await requestFn(baseUrl, "/v2/collection-schedules", { method: "POST", body: JSON.stringify({ subscriptionId: config.targetId, subscriptionVersion: 1, fromDate: config.fromDate, toDate: config.toDate, calendarVersion: config.calendarVersion }) });
  await requestFn(baseUrl, `/v2/collection-schedules/${encodeURIComponent(config.shortId)}/disable`, { method: "POST", body: "{}" });
  await requestFn(baseUrl, `/v2/collection-schedules/${encodeURIComponent(config.targetId)}/enable`, { method: "POST", body: "{}" });
  const result = command([...compose, "up", "-d", "--force-recreate", "market-data-service"], { env: { ...env, STOCKQUANT_SCHEDULER_WORKER: "1", STOCKQUANT_COLLECTION_EXECUTOR: "1", STOCKQUANT_COLLECTION_SUBSCRIPTION_ID: config.targetId, STOCKQUANT_COLLECTION_SECURITY_IDS: config.securityIds.join(",") } });
  if (result.status !== 0) return { status: "FAILED", reasons: [result.stderr.trim() || "promotion compose failed"], exitCode: 1 };
  return { status: "PROMOTED", subscriptionId: config.targetId, securityCount: config.securityIds.length, exitCode: 0 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await promote({ checkOnly: process.argv.includes("--check-only") });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(JSON.stringify({ status: "FAILED", error: String(error) }));
    process.exitCode = 1;
  }
}
