import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { V24LocalDailyCoordinator, type LocalDailyFixture, type V24LocalDailyCoordinatorPorts } from "../application/v24-local-daily-coordinator.js";
import type { V24DailyTargetRepository } from "../ports/v24-daily-target-repository.js";
import { GeneratedV21MarketDataClient } from "../contracts/generated-v21-market-data-client.js";
import { GeneratedPortfolioAccountClient } from "../contracts/generated-portfolio-account-client.js";
import { GeneratedPlatformV13AutoMandateClient } from "../contracts/generated-v13-auto-mandate-client.js";

const path = "fixtures/v2/v2.4/c5-local-engineering-v1/input.json";
const sha256 = "96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea";
export async function loadV24LocalDailyFixture(): Promise<LocalDailyFixture> {
  const file = async (relative: string) => readFile(resolve(process.cwd(), relative)).catch(() => readFile(resolve(process.cwd(), "../..", relative)));
  const schedulePath = "fixtures/v2/v2.4/c5-local-mandate-schedule-v1/schedule.json";
  const scheduleSha256 = "d2bc33ee1d8a7785ab1b6a6285536c8943095e05b3fa610420c01cba56dca500";
  const [bytes, manifestBytes, scheduleBytes, scheduleManifestBytes] = await Promise.all([file(path), file("fixtures/v2/v2.4/c5-local-engineering-v1/manifest.json"), file(schedulePath), file("fixtures/v2/v2.4/c5-local-mandate-schedule-v1/manifest.json")]);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as { fixtureId?: string; fixtureVersion?: string; dataMode?: string; status?: string; files?: Array<{ path: string; sha256: string }> };
  if (manifest.status !== "FROZEN" || manifest.dataMode !== "FIXTURE" || manifest.fixtureId !== "v24-c5-local-engineering" || manifest.fixtureVersion !== "v24-c5-local-engineering-1" || manifest.files?.length !== 1 || manifest.files[0]?.path !== path || manifest.files[0].sha256 !== sha256 || createHash("sha256").update(bytes).digest("hex") !== sha256) throw new Error("C5_LOCAL_FIXTURE_MANIFEST_INVALID");
  const scheduleManifest = JSON.parse(scheduleManifestBytes.toString("utf8")) as { fixtureId?: string; fixtureVersion?: string; dataMode?: string; status?: string; files?: Array<{ path: string; sha256: string }> };
  if (scheduleManifest.status !== "FROZEN" || scheduleManifest.dataMode !== "FIXTURE" || scheduleManifest.fixtureId !== "v24-c5-local-mandate-schedule" || scheduleManifest.fixtureVersion !== "v24-c5-local-mandate-schedule-1" || scheduleManifest.files?.length !== 1 || scheduleManifest.files[0]?.path !== schedulePath || scheduleManifest.files[0].sha256 !== scheduleSha256 || createHash("sha256").update(scheduleBytes).digest("hex") !== scheduleSha256) throw new Error("C5_LOCAL_MANDATE_SCHEDULE_MANIFEST_INVALID");
  const fixture = JSON.parse(bytes.toString("utf8")) as Omit<LocalDailyFixture, "sha256" | "mandateSchedule">;
  const schedule = JSON.parse(scheduleBytes.toString("utf8")) as { baseFixtureSha256: string; strategySha256: string; sessions: LocalDailyFixture["mandateSchedule"] };
  if (schedule.baseFixtureSha256 !== sha256 || schedule.strategySha256 !== "2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8" || !Array.isArray(schedule.sessions) || schedule.sessions.length !== 5) throw new Error("C5_LOCAL_MANDATE_SCHEDULE_INVALID");
  return { ...fixture, sha256, mandateSchedule: schedule.sessions };
}

/** Construction does not start a worker or authorize orders. */
export function createV24LocalDailyCoordinator(input: { marketDataUrl: string; portfolioUrl: string; governanceUrl: string; platformToken: string; targets: V24DailyTargetRepository; request?: typeof fetch }): V24LocalDailyCoordinator {
  const request = input.request ?? fetch;
  const headers = () => ({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${input.platformToken}` });
  const market = new GeneratedV21MarketDataClient(input.marketDataUrl, headers, request);
  const accounts = new GeneratedPortfolioAccountClient(input.portfolioUrl, "platform-api-service", input.platformToken, request);
  const governance = new GeneratedPlatformV13AutoMandateClient(input.governanceUrl, input.platformToken, request);
  return new V24LocalDailyCoordinator({
    loadFixture: loadV24LocalDailyFixture,
    readSessions: (query) => market.getV24DailyBarSessions(query),
    readAccount: (accountId, ownerId) => accounts.getAccountSnapshot(accountId, ownerId),
    readMandate: async (mandateId, testRunId, ownerId) => {
      const response = await governance.read(mandateId, testRunId, ownerId);
      if (response.status === 404) return null;
      if (response.status !== 200 || !response.body || typeof response.body !== "object") throw new Error("C5_LOCAL_MANDATE_READ_UNAVAILABLE");
      return response.body as Awaited<ReturnType<V24LocalDailyCoordinatorPorts["readMandate"]>>;
    },
    readSellable: async (scope, asOf) => {
      const result = await accounts.getAccountSellable(scope.accountId, scope.ownerId, scope.namespace, scope.testRunId, "600000.SH", asOf);
      if (result.accountId !== scope.accountId || result.ownerId !== scope.ownerId || result.namespace !== scope.namespace || result.testRunId !== scope.testRunId || result.security !== "600000.SH" || result.asOf !== asOf || !Number.isSafeInteger(result.sellableQuantity) || result.sellableQuantity < 0) throw new Error("C5_LOCAL_SELLABLE_SCOPE_INVALID");
      return result.sellableQuantity;
    },
    targets: input.targets,
  });
}
