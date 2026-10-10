import { parseSeedPaperArgs, seedV13PaperAccounts } from "./seed-paper-core.mjs";

try {
  const forwardedArgs = process.argv.slice(2);
  if (forwardedArgs[0] === "--") forwardedArgs.shift();
  const selection = parseSeedPaperArgs(forwardedArgs);
  if (selection.help) {
    console.log("usage: pnpm seed:paper -- --stage V1.3 --run <TestRun UUID>");
  } else {
    if (!process.env.STOCKQUANT_PLATFORM_API_URL || !process.env.STOCKQUANT_SESSION_COOKIE) {
      throw new Error("set STOCKQUANT_PLATFORM_API_URL and STOCKQUANT_SESSION_COOKIE for the current loopback V1.3 acceptance stack");
    }
    const result = await seedV13PaperAccounts({
      apiUrl: process.env.STOCKQUANT_PLATFORM_API_URL,
      sessionCookie: process.env.STOCKQUANT_SESSION_COOKIE,
      runId: selection.runId,
    });
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "seed:paper failed");
  process.exitCode = 2;
}
