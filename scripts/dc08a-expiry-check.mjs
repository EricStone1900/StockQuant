import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const warnDays = Number(process.env.DC08A_EXPIRY_WARN_DAYS ?? 10);
const automationPath = path.join(process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"), "automations", "dc-08a", "automation.toml");
const text = await readFile(automationPath, "utf8");
const match = text.match(/UNTIL:(\d{8}T\d{6}Z)/) ?? text.match(/UNTIL=(\d{8}T\d{6}Z)/);
if (!match) {
  console.log(JSON.stringify({ status: "NO_EXPIRY", automation: "dc-08a", path: automationPath }));
  process.exit(0);
}
const value = match[1];
const expiry = new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`);
const days = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
const status = days <= warnDays ? "EXPIRY_APPROACHING" : "OK";
console.log(JSON.stringify({ status, automation: "dc-08a", expiry: expiry.toISOString(), daysRemaining: days, warnDays }));
process.exit(status === "EXPIRY_APPROACHING" ? 2 : 0);
