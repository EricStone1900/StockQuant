import type * as Contracts from "../contracts/generated-types.js";

export interface ReplayPortfolioClient {
  initializeAccount(body: Contracts.InitializeAccountCommand): Promise<{ snapshot: Contracts.AccountSnapshot; replayed: boolean }>;
  getAccountSnapshot(accountId: string, ownerId: string): Promise<Contracts.AccountSnapshot>;
}

export interface ReplayTradeExecutionClient {
  executeHistoricalFakeOrder(body: Contracts.HistoricalFakeExecutionCommand): Promise<Contracts.HistoricalFakeExecutionResult>;
  readHistoricalFakeOrderById(orderId: string): Promise<Contracts.HistoricalFakeOrderState>;
}

export interface ReplayGovernanceAndResearchClient {
  authorizeHistoricalReplayExecution(body: Contracts.ReplayExecutionAuthorizationCommand): Promise<Contracts.ReplayExecutionAuthorizationResult>;
  summarizeHistoricalReplayBars(body: Contracts.MultiBarResearchCommand): Promise<Contracts.MultiBarResearchResult>;
}
