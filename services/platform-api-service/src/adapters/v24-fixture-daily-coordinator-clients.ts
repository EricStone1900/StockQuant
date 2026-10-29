import { V24FixtureDailyCoordinator } from "../application/v24-fixture-daily-coordinator.js";
import type { V24DailyTargetRepository } from "../ports/v24-daily-target-repository.js";
import { GeneratedV21MarketDataClient } from "../contracts/generated-v21-market-data-client.js";
import { GeneratedV24MarketObservationClient } from "../contracts/generated-v24-market-observation-client.js";
import { GeneratedPortfolioAccountClient } from "../contracts/generated-portfolio-account-client.js";
import { loadV24DailyDirectionFixture } from "./v24-daily-direction-fixture.js";

/** Build isolated candidate preparation from service clients. Construction does not start a worker. */
export function createV24FixtureDailyCoordinator(input: { marketDataUrl: string; portfolioUrl: string; platformToken: string; targets: V24DailyTargetRepository; request?: typeof fetch }): V24FixtureDailyCoordinator {
  const request = input.request ?? fetch;
  const headers = () => ({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${input.platformToken}` });
  const market = new GeneratedV21MarketDataClient(input.marketDataUrl, headers, request);
  const calendar = new GeneratedV24MarketObservationClient(input.marketDataUrl, input.platformToken, request);
  const accounts = new GeneratedPortfolioAccountClient(input.portfolioUrl, "platform-api-service", input.platformToken, request);
  return new V24FixtureDailyCoordinator({
    loadFixture: loadV24DailyDirectionFixture,
    readSessions: (query) => market.getV24DailyBarSessions(query),
    readCalendar: (date) => calendar.getCnAShareCalendarSession(date),
    readAccount: (accountId, ownerId) => accounts.getAccountSnapshot(accountId, ownerId),
    targets: input.targets,
  });
}
