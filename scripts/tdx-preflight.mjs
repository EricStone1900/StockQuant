function shanghaiDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
}

export function describeFetchError(error) {
  const cause = error instanceof Error ? error.cause : undefined;
  const causeCode = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : null;
  return { message: error instanceof Error ? error.message : "unknown", causeCode };
}

export async function tdxPreflight({ baseUrl = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002", now = new Date(), fetchImpl = fetch } = {}) {
  const date = shanghaiDate(now);
  try {
    const response = await fetchImpl(`${baseUrl}/v2/calendar/cn-a-share/${date}`, { signal: AbortSignal.timeout(3000) });
    const calendar = await response.json();
    if (!response.ok || !["TRADING", "CLOSED"].includes(calendar?.status)) return { status: "WAITING_DEPENDENCY", date, httpStatus: response.status, calendar, exitCode: 2 };
    return { status: calendar.status === "TRADING" ? "READY" : "NOT_RUN", date, calendar, exitCode: 0 };
  } catch (error) {
    return { status: "WAITING_DEPENDENCY", date, error: describeFetchError(error), exitCode: 2 };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await tdxPreflight();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.exitCode;
}
