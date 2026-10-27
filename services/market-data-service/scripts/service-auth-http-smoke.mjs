import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";

const serviceDir = process.cwd();
const port = 34100 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${port}`;
const token = "market-data-platform-http-smoke-token-2026";
const controlToken = "market-data-collection-control-http-smoke-token-2026";
const child = spawn(process.execPath, [resolve("dist/main.js")], {
  cwd: serviceDir,
  env: {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? "/tmp",
    STOCKQUANT_PROJECT_ROOT: resolve("../.."),
    STOCKQUANT_BIND_HOST: "127.0.0.1",
    STOCKQUANT_PORT: String(port),
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: token,
    STOCKQUANT_COLLECTION_CONTROL_TOKEN: controlToken,
    STOCKQUANT_SCHEDULER_WORKER: "0",
    STOCKQUANT_COLLECTION_EXECUTOR: "0",
  },
  stdio: ["ignore", "ignore", "pipe"],
});
let stderr = "";
child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
const timeout = setTimeout(() => child.kill("SIGKILL"), 15_000);
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error(`Market Data exited before listening: ${stderr}`);
    try { if ((await fetch(`${base}/live`)).ok) { ready = true; break; } } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  assert.equal(ready, true, `Market Data did not become live: ${stderr}`);
  const path = "/v2/minute/csv/import";
  const body = JSON.stringify({});
  const missing = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body });
  const forged = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer forged" }, body });
  const wrongIdentity = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "runner-host", authorization: `Bearer ${token}` }, body });
  const bearerOnly = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body });
  const acceptedIdentity = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }, body });
  const unauthedImportRead = await fetch(`${base}/v2/minute/imports/version-smoke`);
  const bearerOnlyImportRead = await fetch(`${base}/v2/minute/imports/version-smoke`, { headers: { authorization: `Bearer ${token}` } });
  const unauthedFixtureWrite = await fetch(`${base}/v2/minute/import`, { method: "POST", headers: { "content-type": "application/json" }, body });
  const bearerOnlyFixtureWrite = await fetch(`${base}/v2/minute/import`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ fixture: "normal" }) });
  const unauthenticatedMinutePreview = await fetch(`${base}/v2/minute/preview`);
  const authenticatedMinutePreview = await fetch(`${base}/v2/minute/preview`, { headers: { authorization: `Bearer ${token}` } });
  const unauthenticatedLegacyFixture = await fetch(`${base}/v1/fixtures/normal/preview`);
  const authenticatedLegacyFixture = await fetch(`${base}/v1/fixtures/normal/preview`, { headers: { authorization: `Bearer ${token}` } });
  const unauthenticatedArtifactPublish = await fetch(`${base}/v1/artifacts/normal/publish`, { method: "POST" });
  const authenticatedArtifactPublish = await fetch(`${base}/v1/artifacts/normal/publish`, { method: "POST", headers: { authorization: `Bearer ${token}` } });
  const unauthenticatedArtifactTaskCreate = await fetch(`${base}/v1/artifacts/tasks`, { method: "POST" });
  const authenticatedArtifactTaskCreate = await fetch(`${base}/v1/artifacts/tasks`, { method: "POST", headers: { authorization: `Bearer ${token}` } });
  const unauthenticatedArtifactTaskRead = await fetch(`${base}/v1/artifacts/tasks/missing-task`);
  const authenticatedArtifactTaskRead = await fetch(`${base}/v1/artifacts/tasks/missing-task`, { headers: { authorization: `Bearer ${token}` } });
  const unauthenticatedArtifactTaskCancel = await fetch(`${base}/v1/artifacts/tasks/missing-task/cancel`, { method: "POST" });
  const authenticatedArtifactTaskCancel = await fetch(`${base}/v1/artifacts/tasks/missing-task/cancel`, { method: "POST", headers: { authorization: `Bearer ${token}` } });
  const unauthenticatedMinuteQuality = await fetch(`${base}/v2/minute/quality`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
  const authenticatedMinuteQuality = await fetch(`${base}/v2/minute/quality`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({}) });
  const unauthenticatedMinuteCoverage = await fetch(`${base}/v2/minute/coverage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
  const authenticatedMinuteCoverage = await fetch(`${base}/v2/minute/coverage`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({}) });
  const unauthenticatedGapWrite = await fetch(`${base}/v2/minute/gaps`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
  const controlledGapWrite = await fetch(`${base}/v2/minute/gaps`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-control-token": controlToken }, body: JSON.stringify({}) });
  const unauthenticatedWatchlist = await fetch(`${base}/v2/watchlist`);
  const bearerWatchlist = await fetch(`${base}/v2/watchlist`, { headers: { authorization: `Bearer ${token}` } });
  const unauthenticatedSources = await fetch(`${base}/v2/sources`);
  const bearerSources = await fetch(`${base}/v2/sources`, { headers: { authorization: `Bearer ${token}` } });
  const unauthenticatedSampling = await fetch(`${base}/v2/sampling`);
  const bearerSampling = await fetch(`${base}/v2/sampling`, { headers: { authorization: `Bearer ${token}` } });
  const unauthenticatedSamplingChange = await fetch(`${base}/v2/sampling`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ intervalMinutes: 20 }) });
  const authenticatedSamplingChange = await fetch(`${base}/v2/sampling`, { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ intervalMinutes: 20 }) });
  const restoredSampling = await fetch(`${base}/v2/sampling`, { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ intervalMinutes: 30 }) });
  const unauthenticatedNewsPreview = await fetch(`${base}/v2/news/preview`);
  const bearerNewsPreview = await fetch(`${base}/v2/news/preview`, { headers: { authorization: `Bearer ${token}` } });
  const originalWatchlist = await bearerWatchlist.json();
  const unauthenticatedWatchlistWrite = await fetch(`${base}/v2/watchlist`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ securities: ["000001.SZ"] }) });
  const changedWatchlist = await fetch(`${base}/v2/watchlist`, { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ securities: ["000001.SZ"] }) });
  const unauthenticatedQuote = await fetch(`${base}/v2/quote/preview`);
  const unauthorizedQuote = await fetch(`${base}/v2/quote/preview`, { headers: { authorization: `Bearer ${token}` } });
  const unauthorizedNews = await fetch(`${base}/v2/news/live`, { headers: { authorization: `Bearer ${token}` } });
  const unauthorizedSourceSmoke = await fetch(`${base}/v2/sources/smoke`, { headers: { authorization: `Bearer ${token}` } });
  const unauthenticatedBreaker = await fetch(`${base}/v2/sources/tencent-quote/fail`, { method: "POST" });
  const authenticatedBreaker = await fetch(`${base}/v2/sources/tencent-quote/fail`, { method: "POST", headers: { authorization: `Bearer ${token}` } });
  const breakerReset = await fetch(`${base}/v2/sources/tencent-quote/recover`, { method: "POST", headers: { authorization: `Bearer ${token}` } });
  const restoredWatchlist = await fetch(`${base}/v2/watchlist`, { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ securities: originalWatchlist.securities }) });
  assert.equal(missing.status, 401);
  assert.equal(forged.status, 401);
  assert.equal(wrongIdentity.status, 401);
  assert.equal(bearerOnly.status, 503, "the configured platform Bearer token determines service identity");
  assert.equal(acceptedIdentity.status, 503);
  assert.equal((await bearerOnly.json()).code, "PERSISTENCE_UNAVAILABLE");
  assert.equal(unauthedImportRead.status, 401);
  assert.equal(bearerOnlyImportRead.status, 503, "persisted import reads require the same platform service identity");
  assert.equal(unauthedFixtureWrite.status, 401);
  assert.equal(bearerOnlyFixtureWrite.status, 503, "fixture-backed imports require the same platform service identity");
  assert.equal(unauthenticatedMinutePreview.status, 401);
  assert.equal(authenticatedMinutePreview.status, 200, "fixture minute preview requires the same platform service identity");
  assert.equal(unauthenticatedLegacyFixture.status, 401, "V1.2 fixtures require the same platform service identity");
  assert.equal(authenticatedLegacyFixture.status, 200);
  assert.equal(unauthenticatedArtifactPublish.status, 401);
  assert.equal(authenticatedArtifactPublish.status, 200);
  assert.equal(unauthenticatedArtifactTaskCreate.status, 401);
  assert.equal(authenticatedArtifactTaskCreate.status, 503, "artifact task creation fails closed without PostgreSQL persistence");
  assert.equal(unauthenticatedArtifactTaskRead.status, 401);
  assert.equal(authenticatedArtifactTaskRead.status, 503, "artifact task reads fail closed without PostgreSQL persistence");
  assert.equal(unauthenticatedArtifactTaskCancel.status, 401);
  assert.equal(authenticatedArtifactTaskCancel.status, 503, "artifact task cancellation fails closed without PostgreSQL persistence");
  assert.equal(unauthenticatedMinuteQuality.status, 401);
  assert.equal(authenticatedMinuteQuality.status, 422, "authorized quality requests reach the input validator");
  assert.equal(unauthenticatedMinuteCoverage.status, 401);
  assert.equal(authenticatedMinuteCoverage.status, 422, "authorized coverage requests reach the input validator");
  assert.equal(unauthenticatedGapWrite.status, 401, "gap reconciliation writes require collection-control identity");
  assert.equal(controlledGapWrite.status, 503, "valid control identity reaches the persistence boundary");
  assert.equal(unauthenticatedWatchlist.status, 401);
  assert.equal(bearerWatchlist.status, 200);
  assert.equal(unauthenticatedSources.status, 401);
  assert.equal(bearerSources.status, 200);
  assert.equal(unauthenticatedSampling.status, 401);
  assert.equal(bearerSampling.status, 200);
  assert.equal(unauthenticatedSamplingChange.status, 401);
  assert.equal(authenticatedSamplingChange.status, 503, "sampling writes require PostgreSQL even with valid credentials");
  assert.equal((await authenticatedSamplingChange.json()).code, "SAMPLING_PERSISTENCE_UNAVAILABLE");
  assert.equal(restoredSampling.status, 503);
  assert.equal(unauthenticatedNewsPreview.status, 401);
  assert.equal(bearerNewsPreview.status, 200);
  assert.equal(unauthenticatedWatchlistWrite.status, 401);
  assert.equal(changedWatchlist.status, 200);
  assert.equal(unauthenticatedQuote.status, 401, "external quote collection must not run before service authentication");
  assert.equal(unauthorizedQuote.status, 403, "authenticated quote access still requires source-use authorization");
  assert.equal(unauthorizedNews.status, 403, "authenticated news access still requires source-use authorization");
  assert.equal(unauthorizedSourceSmoke.status, 403, "provider probes require source-use authorization");
  assert.equal((await unauthorizedSourceSmoke.json()).externalRequests, 0, "unauthorized smoke must perform no provider requests");
  assert.equal(unauthenticatedBreaker.status, 401);
  assert.equal(authenticatedBreaker.status, 200);
  assert.equal(breakerReset.status, 200);
  assert.equal(restoredWatchlist.status, 200);
  assert.equal((await acceptedIdentity.json()).code, "PERSISTENCE_UNAVAILABLE");
  const unrelated = await fetch(`${base}/v2/calendar/cn-a-share/2026-09-28`);
  assert.equal(unrelated.status, 200, "the minute upload credential must not gate unrelated calendar reads");
  const protectedCollectionReads = [
    "/v2/collection-scheduler/status", "/v2/collection/health?subscriptionId=auth-smoke", "/v2/collection-scheduler/plan?subscriptionId=auth-smoke&from=2026-09-28&to=2026-09-28",
    "/v2/collection-schedules", "/v2/collection-schedules/auth-smoke", "/v2/collection-runs/auth-smoke-run", "/v2/minute/gaps/auth-smoke", "/v2/minute/backfills/auth-smoke-task", "/v2/minute/sources",
  ];
  const collectionReadResults = [];
  for (const readPath of protectedCollectionReads) {
    const unauthenticated = await fetch(`${base}${readPath}`);
    const authenticated = await fetch(`${base}${readPath}`, { headers: { authorization: `Bearer ${token}` } });
    const forgedIdentity = await fetch(`${base}${readPath}`, { headers: { "x-stockquant-service-id": "runner-host", authorization: `Bearer ${token}` } });
    assert.equal(unauthenticated.status, 401, `${readPath} must reject missing service identity`);
    assert.notEqual(authenticated.status, 401, `${readPath} must accept the configured platform Bearer`);
    assert.equal(forgedIdentity.status, 401, `${readPath} must reject a mismatching declared identity`);
    collectionReadResults.push({ path: readPath, anonymous: unauthenticated.status, bearer: authenticated.status, mismatchedIdentity: forgedIdentity.status });
  }
  // Exercise every route family classified as Platform-Bearer-only. These
  // requests deliberately omit credentials, so protected provider/write routes
  // stop at the auth boundary without invoking adapters or changing state.
  const protectedRouteMatrix = [
    ["GET", "/v2/collection-scheduler/status"],
    ["GET", "/v2/collection-scheduler/plan?subscriptionId=s&from=2026-09-28&to=2026-09-28"],
    ["GET", "/v2/collection/health?subscriptionId=s"],
    ["GET", "/v2/collection-schedules"], ["GET", "/v2/collection-schedules/s"],
    ["GET", "/v2/collection-runs"], ["GET", "/v2/collection-runs/run"],
    ["GET", "/v2/minute/gaps/s"], ["GET", "/v2/minute/backfills"], ["GET", "/v2/minute/backfills/task"],
    ["GET", "/v2/minute/sources"], ["GET", "/v1/fixtures/normal/preview"], ["GET", "/v1/fixtures/bad-future/preview"],
    ["POST", "/v1/artifacts/normal/publish"], ["POST", "/v1/artifacts/tasks"], ["GET", "/v1/artifacts/tasks/task"], ["POST", "/v1/artifacts/tasks/task/cancel"],
    ["GET", "/v2/minute/preview"], ["POST", "/v2/minute/quality"], ["POST", "/v2/minute/coverage"],
    ["GET", "/v2/minute/csv/uploads"], ["POST", "/v2/minute/csv/uploads"], ["GET", "/v2/minute/parquet/uploads"], ["POST", "/v2/minute/parquet/uploads"],
    ["POST", "/v2/minute/csv/preview"], ["POST", "/v2/minute/csv/import"],
    ["POST", "/v2/minute/csv/uploads/00000000-0000-4000-8000-000000000001/chunks/0"],
    ["POST", "/v2/minute/parquet/uploads/00000000-0000-4000-8000-000000000001/chunks/0"],
    ["POST", "/v2/minute/csv/uploads/00000000-0000-4000-8000-000000000001/preview"],
    ["POST", "/v2/minute/parquet/uploads/00000000-0000-4000-8000-000000000001/finalize"],
    ["GET", "/v2/minute/imports/version"], ["GET", "/v2/minute/imports/version/bars?offset=0&limit=1"],
    ["GET", "/v2/watchlist"], ["PUT", "/v2/watchlist"], ["GET", "/v2/sources"], ["GET", "/v2/sampling"], ["PUT", "/v2/sampling"],
    ["GET", "/v2/quote/preview"], ["GET", "/v2/news/preview"], ["GET", "/v2/news/live"], ["GET", "/v2/sources/smoke"],
    ["POST", "/v2/sources/tencent-quote/fail"], ["POST", "/v2/sources/tencent-quote/recover"],
  ];
  const routeMatrixResults = [];
  for (const [method, route] of protectedRouteMatrix) {
    const response = await fetch(`${base}${route}`, { method });
    assert.equal(response.status, 401, `${method} ${route} must reject before route handling without Platform Bearer`);
    routeMatrixResults.push({ method, path: route.split("?", 1)[0], anonymous: response.status });
  }
  const projectClaims = { "content-type": "application/json", "x-stockquant-project-id": "smoke-project", "x-stockquant-scopes": "DATA_READ,DATA_EXPORT" };
  const projectRouteCases = [
    ["POST", "/v2/projects/access", { resourceProjectId: "smoke-project", scope: "DATA_READ" }],
    ["POST", "/v2/data/page", { projectId: "smoke-project", dataVersion: "v1", items: [{ id: 1 }] }],
    ["POST", "/v2/data/export", { projectId: "smoke-project", dataVersion: "v1", items: [{ id: 1 }] }],
    ["GET", "/v2/projects/queue-metrics", undefined],
  ];
  const projectClaimResults = [];
  for (const [method, route, body] of projectRouteCases) {
    const options = { method, headers: projectClaims, ...(body ? { body: JSON.stringify(body) } : {}) };
    const forged = await fetch(`${base}${route}`, options);
    assert.equal(forged.status, 401, `${method} ${route} must not trust caller-supplied project scopes when the credential registry is unavailable`);
    const serviceBearerOnly = await fetch(`${base}${route}`, { ...options, headers: { ...projectClaims, authorization: `Bearer ${token}`, "x-stockquant-service-id": "platform-api-service" } });
    assert.equal(serviceBearerOnly.status, 401, `${method} ${route} requires project credentials; a Platform service identity is not a project token`);
    projectClaimResults.push({ method, path: route, forgedProjectClaims: forged.status, platformBearerOnly: serviceBearerOnly.status });
  }
  process.stdout.write(`${JSON.stringify({ missingBearer: missing.status, forgedBearer: forged.status, wrongService: wrongIdentity.status, bearerOnlyPlatformIdentity: bearerOnly.status, validPlatformIdentity: acceptedIdentity.status, unauthenticatedImportRead: unauthedImportRead.status, bearerOnlyImportRead: bearerOnlyImportRead.status, unauthenticatedFixtureWrite: unauthedFixtureWrite.status, bearerOnlyFixtureWrite: bearerOnlyFixtureWrite.status, unauthenticatedMinutePreview: unauthenticatedMinutePreview.status, authenticatedMinutePreview: authenticatedMinutePreview.status, unauthenticatedLegacyFixture: unauthenticatedLegacyFixture.status, authenticatedLegacyFixture: authenticatedLegacyFixture.status, unauthenticatedArtifactPublish: unauthenticatedArtifactPublish.status, authenticatedArtifactPublish: authenticatedArtifactPublish.status, unauthenticatedMinuteQuality: unauthenticatedMinuteQuality.status, authenticatedMinuteQuality: authenticatedMinuteQuality.status, unauthenticatedMinuteCoverage: unauthenticatedMinuteCoverage.status, authenticatedMinuteCoverage: authenticatedMinuteCoverage.status, unauthenticatedGapWrite: unauthenticatedGapWrite.status, controlledGapWrite: controlledGapWrite.status, unauthenticatedSources: unauthenticatedSources.status, bearerSources: bearerSources.status, unauthenticatedSampling: unauthenticatedSampling.status, bearerSampling: bearerSampling.status, unauthenticatedSamplingChange: unauthenticatedSamplingChange.status, authenticatedSamplingChange: authenticatedSamplingChange.status, restoredSampling: restoredSampling.status, unauthenticatedNewsPreview: unauthenticatedNewsPreview.status, bearerNewsPreview: bearerNewsPreview.status, unauthorizedQuote: unauthorizedQuote.status, unauthorizedNews: unauthorizedNews.status, unauthorizedSourceSmoke: unauthorizedSourceSmoke.status, unauthorizedSourceRequests: 0, unauthenticatedWatchlist: unauthenticatedWatchlist.status, bearerWatchlist: bearerWatchlist.status, unauthenticatedWatchlistWrite: unauthenticatedWatchlistWrite.status, bearerWatchlistWrite: changedWatchlist.status, unauthenticatedQuote: unauthenticatedQuote.status, unauthenticatedBreaker: unauthenticatedBreaker.status, bearerBreaker: authenticatedBreaker.status, breakerReset: breakerReset.status, watchlistRestored: restoredWatchlist.status, protectedCollectionReads: collectionReadResults, protectedRouteMatrix: routeMatrixResults, projectClaimMatrix: projectClaimResults, unrelatedCalendar: unrelated.status })}\n`);
} finally {
  clearTimeout(timeout);
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), new Promise((resolveDelay) => setTimeout(resolveDelay, 3_000))]);
  }
  if (child.exitCode === null) child.kill("SIGKILL");
}
