import { spawnSync } from "node:child_process";
import { paperVerificationCommand } from "./verify-paper-core.mjs";

try {
  const forwardedArgs = process.argv.slice(2);
  if (forwardedArgs[0] === "--") forwardedArgs.shift();
  const command = paperVerificationCommand(forwardedArgs);
  if (command === null) {
    console.log("Runs the V1.3 isolated CN_A/US_EQUITY PAPER+FAKE Web/API/CLI normal, rejection and recovery E2E suite.");
  } else {
    console.log("[verify:paper] scope=V1.3 CN_A+US_EQUITY PAPER+FAKE; external market/broker calls disabled");
    const result = spawnSync(command[0], command[1], { stdio: "inherit", env: process.env });
    const exitCode = result.status ?? 1;
    console.log(JSON.stringify({ command: "verify:paper", delegatedCommand: `${command[0]} ${command[1].join(" ")}`, status: exitCode === 0 ? "PASS" : exitCode === 2 ? "INCOMPLETE" : "FAIL", exitCode }));
    process.exitCode = exitCode;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "verify:paper failed");
  process.exitCode = 2;
}
