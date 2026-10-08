// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/decision-governance-v13-auto-mandates.v1.json
import type * as Contracts from "./generated-types.js";

export type V13AutoMandateResponse<T = unknown> = { status: number; body?: T | Record<string, unknown> };

export class GeneratedPlatformV13AutoMandateClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }
  async create(body: Contracts.V13AutoMandateCommand, ownerId: string, actorId: string, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    return this.send("/internal/v1/auto-mandates", body, { "x-stockquant-owner-id": ownerId, "x-stockquant-actor-id": actorId }, timeoutMs);
  }
  async read(mandateId: string, testRunId: string, ownerId: string, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    const path = "/internal/v1/auto-mandates/" + encodeURIComponent(mandateId) + "/runs/" + encodeURIComponent(testRunId);
    const response = await this.request(this.baseUrl + path, { method: "GET", headers: { "x-stockquant-service-id": "platform-api-service", "x-stockquant-owner-id": ownerId, authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string,unknown> | undefined };
  }
  async activate(mandateId: string, body: Contracts.V13AutoMandateTransitionCommand, ownerId: string, actorId: string, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    return this.send("/internal/v1/auto-mandates/" + encodeURIComponent(mandateId) + "/activate", body, { "x-stockquant-owner-id": ownerId, "x-stockquant-actor-id": actorId }, timeoutMs);
  }
  async pause(mandateId: string, body: Contracts.V13AutoMandateTransitionCommand, ownerId: string, actorId: string, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    return this.send("/internal/v1/auto-mandates/" + encodeURIComponent(mandateId) + "/pause", body, { "x-stockquant-owner-id": ownerId, "x-stockquant-actor-id": actorId }, timeoutMs);
  }
  private async send(path: string, body: unknown, extraHeaders: Record<string,string>, timeoutMs: number): Promise<V13AutoMandateResponse> {
    const headers: Record<string,string> = { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken };
    const response = await this.request(this.baseUrl + path, { method: "POST", headers: { ...headers, ...extraHeaders }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string,unknown> | undefined };
  }
}
