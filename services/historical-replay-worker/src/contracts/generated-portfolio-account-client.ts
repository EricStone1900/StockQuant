// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/portfolio-account.v1.json
import type * as Contracts from "./generated-types.js";

export type PortfolioAccountCaller = "platform-api-service" | "trade-execution-service" | "historical-replay-worker";

export class PortfolioAccountClientError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super(`Portfolio Risk returned HTTP ${status}`); this.name = "PortfolioAccountClientError"; }
}

export class GeneratedPortfolioAccountClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly callerId: PortfolioAccountCaller, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("portfolio base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("portfolio service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async recordAccountFill(accountId: string, body: Contracts.ReservedFillCommand): Promise<{ "snapshot": Contracts.AccountSnapshot; "replayed": true; } | { "snapshot": Contracts.AccountSnapshot; "replayed": false; }> {
    const path = `/internal/v1/accounts/${encodeURIComponent(accountId)}/fills`;
    return this.send<{ "snapshot": Contracts.AccountSnapshot; "replayed": true; } | { "snapshot": Contracts.AccountSnapshot; "replayed": false; }>("POST", path, body);
  }

  async correctAccountFillFee(accountId: string, externalFillId: string, body: Contracts.FillFeeCorrectionCommand): Promise<{ "snapshot": Contracts.AccountSnapshot; "replayed": boolean; }> {
    const path = `/internal/v1/accounts/${encodeURIComponent(accountId)}/fills/${encodeURIComponent(externalFillId)}/fee-corrections`;
    return this.send<{ "snapshot": Contracts.AccountSnapshot; "replayed": boolean; }>("POST", path, body);
  }

  async initializeAccount(body: Contracts.InitializeAccountCommand): Promise<{ "snapshot": Contracts.AccountSnapshot; "replayed": boolean; }> {
    const path = `/internal/v1/accounts/initialize`;
    return this.send<{ "snapshot": Contracts.AccountSnapshot; "replayed": boolean; }>("POST", path, body);
  }

  async settleAccountReceivables(accountId: string, body: { "asOf": string; }): Promise<{ "settledFillIds": Array<string>; }> {
    const path = `/internal/v1/accounts/${encodeURIComponent(accountId)}/settlements`;
    return this.send<{ "settledFillIds": Array<string>; }>("POST", path, body);
  }

  async getAccountSellable(accountId: string, ownerId: string, namespace: string, testRunId: string, security: string, asOf: string): Promise<{ "accountId": string; "ownerId": string; "namespace": string; "testRunId": string; "security": string; "asOf": string; "sellableQuantity": number; }> {
    const path = `/internal/v1/accounts/${encodeURIComponent(accountId)}/sellable` + "?" + new URLSearchParams({ namespace, testRunId, security, asOf }).toString();
    return this.send<{ "accountId": string; "ownerId": string; "namespace": string; "testRunId": string; "security": string; "asOf": string; "sellableQuantity": number; }>("GET", path, undefined, { "x-stockquant-owner-id": ownerId });
  }

  async getAccountSnapshot(accountId: string, ownerId: string): Promise<Contracts.AccountSnapshot> {
    const path = `/internal/v1/accounts/${encodeURIComponent(accountId)}/snapshot`;
    return this.send<Contracts.AccountSnapshot>("GET", path, undefined, { "x-stockquant-owner-id": ownerId });
  }

  async reserveAccountResources(accountId: string, body: { "namespace": string; "testRunId": string; "ownerId": string; "idempotencyKey": string; "clientOrderId": string; "side": "BUY" | "SELL"; "currency": string; "cashAmount"?: string | null; "security"?: string | null; "quantity"?: number | null; "asOf"?: string; }): Promise<{ "reservation": Contracts.ResourceReservation; "replayed": boolean; }> {
    const path = `/internal/v1/accounts/${encodeURIComponent(accountId)}/reservations`;
    return this.send<{ "reservation": Contracts.ResourceReservation; "replayed": boolean; }>("POST", path, body);
  }

  async resolveAccountReservation(accountId: string, reservationId: string, body: { "namespace": string; "testRunId": string; "ownerId": string; "outcome": "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED" | "UNKNOWN"; "evidenceRef": string; }): Promise<Contracts.ResourceReservation> {
    const path = `/internal/v1/accounts/${encodeURIComponent(accountId)}/reservations/${encodeURIComponent(reservationId)}/resolve`;
    return this.send<Contracts.ResourceReservation>("POST", path, body);
  }

  private async send<T>(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
    const response = await this.request(`${this.baseUrl}${path}`, { method, headers: { "content-type": "application/json", "x-stockquant-service-id": this.callerId, authorization: `Bearer ${this.bearerToken}`, ...extraHeaders }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });
    const value = await response.json().catch(() => null);
    if (!response.ok) throw new PortfolioAccountClientError(response.status, value);
    return value as T;
  }
}
