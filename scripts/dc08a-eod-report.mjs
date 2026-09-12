import { createDailyReport } from "./dc08a-daily-report.mjs";

export function finalReportExitCode(report) {
  // Non-trading days are expected and should not page. A trading day is
  // successful only when the complete expected coverage is present.
  if (!report?.tradingDay) return 0;
  return report.status === "PASS" ? 0 : 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await createDailyReport({
      subscriptionId: process.env.DC08A_SUBSCRIPTION_ID ?? "dc08a-20260914-short-v1",
      securityCount: Number(process.env.DC08A_SECURITY_COUNT ?? 3),
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = finalReportExitCode(result.report);
  } catch (error) {
    console.error(JSON.stringify({ status: "FAILED", error: String(error) }));
    process.exitCode = 1;
  }
}
