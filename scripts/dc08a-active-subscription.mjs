import { platformMarketDataHeaders } from "./market-data-service-identity.mjs";

export function selectActiveSubscription(schedules) {
  const active = schedules.filter((schedule) => schedule.enabled);
  if (active.length !== 1) throw new Error(`expected exactly one enabled subscription, found ${active.length}`);
  return active[0];
}

export async function readEnabledSubscriptionCount({ baseUrl = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002", fetchImpl = fetch, env = process.env, file = ".env.local" } = {}) {
  const response = await fetchImpl(`${baseUrl}/v2/collection-schedules`, { headers: platformMarketDataHeaders({ env, file }), signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error(`market-data-service schedule read failed (${response.status})`);
  const body = await response.json();
  return (body.schedules ?? []).filter((schedule) => schedule.enabled).length;
}

export async function readActiveSubscription({ baseUrl = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002", fetchImpl = fetch, env = process.env, file = ".env.local" } = {}) {
  const [scheduleResponse, readyResponse] = await Promise.all([
    fetchImpl(`${baseUrl}/v2/collection-schedules`, { headers: platformMarketDataHeaders({ env, file }), signal: AbortSignal.timeout(3000) }),
    fetchImpl(`${baseUrl}/ready`, { signal: AbortSignal.timeout(3000) }),
  ]);
  if (!scheduleResponse.ok || !readyResponse.ok) throw new Error(`market-data-service is not ready (${scheduleResponse.status}/${readyResponse.status})`);
  const [scheduleBody, readyBody] = await Promise.all([scheduleResponse.json(), readyResponse.json()]);
  const active = selectActiveSubscription(scheduleBody.schedules ?? []);
  return { subscriptionId: active.subscriptionId, securityIds: readyBody.collectionSecurityIds ?? [] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const field = process.argv.includes("--field") ? process.argv[process.argv.indexOf("--field") + 1] : "id";
    if (field === "enabled-count") {
      console.log(await readEnabledSubscriptionCount());
      process.exit(0);
    }
    const result = await readActiveSubscription();
    if (field === "id") console.log(result.subscriptionId);
    else if (field === "count") console.log(result.securityIds.length);
    else if (field === "securities") console.log(result.securityIds.join(","));
    else throw new Error(`unknown field: ${field}`);
  } catch (error) {
    console.error(String(error));
    process.exitCode = 2;
  }
}
