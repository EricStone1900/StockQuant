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
  check(field(files.legacy, "status") === "PAUSED", "legacy-paused", "stockquant must remain PAUSED", failures);
  check(field(files.promotion, "status") === "ACTIVE", "promotion-active", "dc-08a-20 must be ACTIVE", failures);
  check(morningRule.includes("DTSTART:20260917T004500") && morningRule.includes("BYDAY=MO,TU,WE,TH,FR"), "morning-trigger", morningRule, failures);
  check(promotionRule.includes("DTSTART:20260917T000000") && promotionRule.includes("RRULE:FREQ=MINUTELY;COUNT=1"), "promotion-once", promotionRule, failures);
  for (const command of ["pnpm dc08a:promote-20 -- --check-only", "pnpm dc08a:active-subscription -- --field id", "pnpm dc08a:active-subscription -- --field count", "pnpm dc08a:supervise -- --check-only"]) {
    check(files.promotion.includes(command), "promotion-command", command, failures);
  }
  const result = { status: failures.length === 0 ? "PASS" : "FAIL", automationDir, failures };
  console.log(JSON.stringify(result, null, 2));
  return failures.length === 0 ? 0 : 1;
}

try {
  process.exitCode = await run();
} catch (error) {
  console.error(JSON.stringify({ status: "FAIL", error: String(error) }, null, 2));
  process.exitCode = 1;
}
