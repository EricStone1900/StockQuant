import { spawnSync } from "node:child_process";
import { composeArgs } from "./dc08a-supervise.mjs";

export function recoveryProbeRequest({ securityIds, today }) {
  const end = new Date(`${today}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() - 4);
  return {
    operation: "RECOVERY_PROBE",
    securityIds: securityIds.slice(0, 1),
    startDate: end.toISOString().slice(0, 10),
    endDate: today,
    probeTimeoutSeconds: 3,
  };
}

export async function probeSourceRecovery({
  securityIds,
  today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()),
  command = (binary, args, input) => spawnSync(binary, args, {
    encoding: "utf8",
    input,
    timeout: 15_000,
    stdio: ["pipe", "pipe", "pipe"],
  }),
} = {}) {
  if (!Array.isArray(securityIds) || securityIds.length === 0) {
    return { status: "SKIPPED", reason: "NO_ACTIVE_SECURITIES", attempts: [] };
  }
  const request = recoveryProbeRequest({ securityIds, today });
  const result = command("docker", [...composeArgs, "run", "--rm", "--no-deps", "-T", "market-data-service", "python3", "-m", "market_data_adapter.cli"], JSON.stringify(request));
  if (result.error || result.status !== 0) {
    return { status: "FAILED", exitCode: result.status ?? 1, error: result.error ? String(result.error) : result.stderr, request };
  }
  try {
    const output = JSON.parse(result.stdout);
    return { ...output, request };
  } catch (error) {
    return { status: "FAILED", error: `invalid adapter response: ${String(error)}`, stdout: result.stdout, request };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const securityIds = (process.env.STOCKQUANT_COLLECTION_SECURITY_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const result = await probeSourceRecovery({ securityIds });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === "FAILED" ? 1 : 0;
}
