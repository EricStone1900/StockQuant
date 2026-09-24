import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function field(toml, name) {
  const match = toml.match(new RegExp(`^${name}\\s*=\\s*"([\\s\\S]*?)"\\s*$`, "m"));
  return match?.[1] ?? "";
}

function check(condition, name, details, failures) {
  if (!condition) failures.push({ name, details });
}

async function run() {
  const codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
  const automationDir = path.join(codexHome, "automations");
  const files = Object.fromEntries(await Promise.all([
    ["heartbeat", "a-20"],
    ["legacy", "stockquant"],
    ["promotion", "dc-08a-20"],
    ["eod", "dc-08a-2"],
    ["tdxAm", "stockquant-tdx"],
    ["tdxPm", "stockquant-tdx-2"],
  ].map(async ([key, id]) => [key, await readFile(path.join(automationDir, id, "automation.toml"), "utf8")])));
  const failures = [];
  const heartbeatRule = field(files.heartbeat, "rrule");
  const promotionRule = field(files.promotion, "rrule");
  const morning = await readFile(path.join(automationDir, "dc-08a", "automation.toml"), "utf8");
  const morningRule = field(morning, "rrule");
  check(field(files.heartbeat, "status") === "ACTIVE", "heartbeat-active", "a-20 must be ACTIVE", failures);
  check(heartbeatRule.includes("BYMINUTE=0,15,30,45"), "heartbeat-quarter-hour", heartbeatRule, failures);
  check(heartbeatRule.includes("BYHOUR=8,9,10,11,12,13,14,15,16,17"), "heartbeat-hours", heartbeatRule, failures);
  check(files.heartbeat.includes("pnpm dc08a:monitor") && files.heartbeat.includes("pnpm dc08a:eod"), "heartbeat-commands", "monitor/eod commands missing", failures);
  check(files.heartbeat.includes("pnpm dc08a:health-report") && files.heartbeat.includes("pnpm dc08a:observation-summary"), "heartbeat-health-commands", "health/observation summary commands missing", failures);
  check(files.heartbeat.includes("退出码2") || files.heartbeat.includes("exit code 2"), "observation-waiting-code", "observation waiting exit code handling missing", failures);
  check(field(files.eod, "status") === "ACTIVE", "eod-active", "dc-08a-2 must be ACTIVE", failures);
  check(field(files.eod, "rrule").includes("DTSTART:20260914T072000") && !field(files.eod, "rrule").includes("UNTIL="), "eod-recurring-no-expiry", field(files.eod, "rrule"), failures);
  check(field(morning, "status") === "ACTIVE", "morning-active", "dc-08a must be ACTIVE", failures);
  check(field(files.legacy, "status") === "PAUSED", "legacy-paused", "stockquant must remain PAUSED", failures);
  check(field(files.promotion, "status") === "PAUSED", "promotion-paused", "completed one-shot dc-08a-20 must be PAUSED", failures);
  check(field(files.tdxAm, "status") === "ACTIVE", "tdx-am-active", "stockquant-tdx must be ACTIVE", failures);
  check(field(files.tdxPm, "status") === "ACTIVE", "tdx-pm-active", "stockquant-tdx-2 must be ACTIVE", failures);
  check(field(files.tdxAm, "rrule").includes("BYHOUR=11;BYMINUTE=35"), "tdx-am-schedule", field(files.tdxAm, "rrule"), failures);
  check(field(files.tdxPm, "rrule").includes("BYHOUR=15;BYMINUTE=20"), "tdx-pm-schedule", field(files.tdxPm, "rrule"), failures);
  check(files.tdxAm.includes("pnpm v25:probe-tdx") && files.tdxPm.includes("pnpm v25:probe-tdx"), "tdx-probe-commands", "TDX probe command missing", failures);
  check(files.tdxAm.includes("--session morning"), "tdx-am-session", "morning probe must validate the morning window", failures);
  check(files.tdxPm.includes("--session full"), "tdx-pm-session", "closing probe must validate the full-day window", failures);
  const formalTdxSecurityIds = ["600000.SH", "600004.SH", "600006.SH", "600007.SH", "600008.SH", "600009.SH", "600010.SH", "600011.SH", "600012.SH", "600015.SH", "600016.SH", "600017.SH", "600018.SH", "600019.SH", "600020.SH", "600021.SH", "600022.SH", "600023.SH", "600025.SH", "600026.SH"];
  for (const [key, label] of [["tdxAm", "tdx-am"], ["tdxPm", "tdx-pm"]]) {
    for (const securityId of formalTdxSecurityIds) check(files[key].includes(securityId), `${label}-${securityId}`, `${label} prompt must include formal security ${securityId}`, failures);
    check(!files[key].includes("000001.SZ") && !files[key].includes("600519.SH"), `${label}-formal-universe`, `${label} prompt contains a non-formal security universe`, failures);
  }
  check(morningRule.includes("DTSTART:20260917T004500") && morningRule.includes("BYDAY=MO,TU,WE,TH,FR") && morningRule.includes("UNTIL=20261030T004500Z"), "morning-trigger-and-expiry", morningRule, failures);
  check(!heartbeatRule.includes("UNTIL=") && !field(files.heartbeat, "rrule").includes("COUNT="), "heartbeat-unbounded-by-design", heartbeatRule, failures);
  check(promotionRule.includes("DTSTART:20260917T000000") && promotionRule.includes("RRULE:FREQ=MINUTELY;COUNT=1"), "promotion-once", promotionRule, failures);
  for (const command of ["pnpm dc08a:promote-20 -- --check-only", "pnpm dc08a:active-subscription -- --field id", "pnpm dc08a:active-subscription -- --field count", "pnpm dc08a:supervise -- --check-only"]) {
    check(files.promotion.includes(command), "promotion-command", command, failures);
  }
  const result = {
    status: failures.length === 0 ? "PASS" : "FAIL",
    automationDir,
    automations: [
      { id: "a-20", status: field(files.heartbeat, "status"), expiry: "none (continuous heartbeat)" },
      { id: "dc-08a", status: field(morning, "status"), expiry: "2026-10-30T00:45:00Z" },
      { id: "dc-08a-2", status: field(files.eod, "status"), expiry: "none (daily recurrence)" },
      { id: "dc-08a-20", status: field(files.promotion, "status"), expiry: "paused one-shot; COUNT=1" },
      { id: "stockquant", status: field(files.legacy, "status"), expiry: "paused legacy task" },
      { id: "stockquant-tdx", status: field(files.tdxAm, "status"), expiry: "weekday 11:35 local" },
      { id: "stockquant-tdx-2", status: field(files.tdxPm, "status"), expiry: "weekday 15:20 local" },
    ],
    failures,
  };
  console.log(JSON.stringify(result, null, 2));
  return failures.length === 0 ? 0 : 1;
}

try {
  process.exitCode = await run();
} catch (error) {
  console.error(JSON.stringify({ status: "FAIL", error: String(error) }, null, 2));
  process.exitCode = 1;
}
