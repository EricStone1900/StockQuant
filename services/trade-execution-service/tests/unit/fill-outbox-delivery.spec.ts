import { describe, expect, it, vi } from "vitest";
import { FillOutboxDelivery } from "../../src/application/fill-outbox-delivery.js";
import type { FillOutboxPayload } from "../../src/domain/portfolio-fill.js";
import type { FakeBrokerOutboxPort } from "../../src/ports/fake-broker-outbox.js";

const payload: FillOutboxPayload & { reservationOutcome: string } = {
  accountId: "account-1", namespace: "run-1", security: "CN:600000", externalFillId: "fill-1",
  quantity: 100, price: "10.00", fee: "5.00", effectiveAt: "2026-09-30T01:31:00.000Z", side: "BUY", currency: "CNY",
  reservation: { reservationId: "reservation-1", ownerId: "owner-1", testRunId: "run-1", clientOrderId: "order-1" },
  reservationOutcome: "FILLED",
};

function outboxPort() {
  return {
    pendingOutbox: vi.fn(async () => [{ event_id: "event-1" }]),
    claimOutbox: vi.fn(async () => ({ claim_token: "claim-1", payload })),
    markFillDelivered: vi.fn(async () => undefined),
    markFillDeliveryFailed: vi.fn(async () => undefined),
    pendingFeeCorrectionOutbox: vi.fn(async () => []),
    claimFeeCorrectionOutbox: vi.fn(async () => null),
    markFeeCorrectionDelivered: vi.fn(async () => undefined),
    markFeeCorrectionFailed: vi.fn(async () => undefined),
    pendingReservationResolutionOutbox: vi.fn(async () => []),
    reservationResolutionForOrder: vi.fn(async () => null),
    claimReservationResolutionOutbox: vi.fn(async () => null),
    markReservationResolutionDelivered: vi.fn(async () => undefined),
    markReservationResolutionFailed: vi.fn(async () => undefined),
  } satisfies FakeBrokerOutboxPort;
}

describe("FillOutboxDelivery", () => {
  it("posts the canonical fill and resolves its reservation before acknowledging the outbox", async () => {
    const outbox = outboxPort();
    const portfolio = { recordAccountFill: vi.fn(async () => undefined), correctAccountFillFee: vi.fn(async () => undefined), resolveAccountReservation: vi.fn(async () => undefined) };
    const delivery = new FillOutboxDelivery(outbox, portfolio);

    await expect(delivery.deliver("event-1")).resolves.toBe(true);
    expect(portfolio.recordAccountFill).toHaveBeenCalledWith("account-1", expect.objectContaining({ externalFillId: "fill-1", side: "BUY" }));
    expect(portfolio.resolveAccountReservation).toHaveBeenCalledWith("account-1", "reservation-1", expect.objectContaining({ outcome: "FILLED", evidenceRef: "fakebroker-outbox:event-1" }));
    expect(outbox.markFillDelivered).toHaveBeenCalledWith("event-1", "claim-1");
  });

  it("keeps failed ledger posting retryable and does not acknowledge the outbox", async () => {
    const outbox = outboxPort();
    const portfolio = { recordAccountFill: vi.fn(async () => { throw new Error("portfolio unavailable"); }), correctAccountFillFee: vi.fn(), resolveAccountReservation: vi.fn() };
    const delivery = new FillOutboxDelivery(outbox, portfolio);

    await expect(delivery.deliver("event-1")).resolves.toBe(false);
    expect(outbox.markFillDeliveryFailed).toHaveBeenCalledWith("event-1", "claim-1", "portfolio unavailable");
    expect(outbox.markFillDelivered).not.toHaveBeenCalled();
    expect(portfolio.resolveAccountReservation).not.toHaveBeenCalled();
  });

  it("drains pending event ids through the same idempotent delivery path", async () => {
    const outbox = outboxPort();
    const portfolio = { recordAccountFill: vi.fn(async () => undefined), correctAccountFillFee: vi.fn(async () => undefined), resolveAccountReservation: vi.fn(async () => undefined) };
    const delivery = new FillOutboxDelivery(outbox, portfolio);

    await expect(delivery.drainPending()).resolves.toBe(1);
    expect(outbox.pendingOutbox).toHaveBeenCalledOnce();
    expect(outbox.claimOutbox).toHaveBeenCalledWith("event-1");
    expect(outbox.pendingReservationResolutionOutbox).toHaveBeenCalledOnce();
  });

  it("delivers cancellation reservation release through the durable outbox before acknowledging it", async () => {
    const outbox = outboxPort();
    outbox.claimReservationResolutionOutbox.mockResolvedValue({ claim_token: "cancel-claim", payload: {
      accountId: "account-1", reservationId: "reservation-1", namespace: "run-1", testRunId: "run-1", ownerId: "owner-1",
      outcome: "CANCELLED", evidenceRef: "fakebroker-cancel:order-1",
    } });
    const portfolio = { recordAccountFill: vi.fn(), correctAccountFillFee: vi.fn(), resolveAccountReservation: vi.fn(async () => undefined) };
    const delivery = new FillOutboxDelivery(outbox, portfolio);

    await expect(delivery.deliverReservationResolution("cancel-event")).resolves.toBe(true);
    expect(portfolio.resolveAccountReservation).toHaveBeenCalledWith("account-1", "reservation-1", expect.objectContaining({ outcome: "CANCELLED", evidenceRef: "fakebroker-cancel:order-1" }));
    expect(outbox.markReservationResolutionDelivered).toHaveBeenCalledWith("cancel-event", "cancel-claim");
  });

  it("delivers confirmed expiry reservation release through the durable outbox", async () => {
    const outbox = outboxPort();
    outbox.claimReservationResolutionOutbox.mockResolvedValue({ claim_token: "expiry-claim", payload: {
      accountId: "account-1", reservationId: "reservation-1", namespace: "run-1", testRunId: "run-1", ownerId: "owner-1",
      outcome: "EXPIRED", evidenceRef: "fakebroker-expired:order-1",
    } });
    const portfolio = { recordAccountFill: vi.fn(), correctAccountFillFee: vi.fn(), resolveAccountReservation: vi.fn(async () => undefined) };
    const delivery = new FillOutboxDelivery(outbox, portfolio);

    await expect(delivery.deliverReservationResolution("expiry-event")).resolves.toBe(true);
    expect(portfolio.resolveAccountReservation).toHaveBeenCalledWith("account-1", "reservation-1", expect.objectContaining({ outcome: "EXPIRED", evidenceRef: "fakebroker-expired:order-1" }));
    expect(outbox.markReservationResolutionDelivered).toHaveBeenCalledWith("expiry-event", "expiry-claim");
  });

  it("delivers a terminal FakeBroker rejection reservation release through the durable outbox", async () => {
    const outbox = outboxPort();
    outbox.claimReservationResolutionOutbox.mockResolvedValue({ claim_token: "rejection-claim", payload: {
      accountId: "account-1", reservationId: "reservation-1", namespace: "run-1", testRunId: "run-1", ownerId: "owner-1",
      outcome: "REJECTED", evidenceRef: "fakebroker-rejected:order-1:ZERO_VOLUME",
    } });
    const portfolio = { recordAccountFill: vi.fn(), correctAccountFillFee: vi.fn(), resolveAccountReservation: vi.fn(async () => undefined) };
    const delivery = new FillOutboxDelivery(outbox, portfolio);

    await expect(delivery.deliverReservationResolution("rejection-event")).resolves.toBe(true);
    expect(portfolio.resolveAccountReservation).toHaveBeenCalledWith("account-1", "reservation-1", expect.objectContaining({ outcome: "REJECTED", evidenceRef: "fakebroker-rejected:order-1:ZERO_VOLUME" }));
    expect(outbox.markReservationResolutionDelivered).toHaveBeenCalledWith("rejection-event", "rejection-claim");
  });

  it("keeps cancellation reservation release retryable when Portfolio is unavailable", async () => {
    const outbox = outboxPort();
    outbox.claimReservationResolutionOutbox.mockResolvedValue({ claim_token: "cancel-claim", payload: {
      accountId: "account-1", reservationId: "reservation-1", namespace: "run-1", testRunId: "run-1", ownerId: "owner-1",
      outcome: "CANCELLED", evidenceRef: "fakebroker-cancel:order-1",
    } });
    const portfolio = { recordAccountFill: vi.fn(), correctAccountFillFee: vi.fn(), resolveAccountReservation: vi.fn(async () => { throw new Error("portfolio unavailable"); }) };
    const delivery = new FillOutboxDelivery(outbox, portfolio);

    await expect(delivery.deliverReservationResolution("cancel-event")).resolves.toBe(false);
    expect(outbox.markReservationResolutionFailed).toHaveBeenCalledWith("cancel-event", "cancel-claim", "portfolio unavailable");
    expect(outbox.markReservationResolutionDelivered).not.toHaveBeenCalled();
  });

  it("delivers versioned fee correction to Portfolio before acknowledging its durable outbox event", async () => {
    const outbox = outboxPort();
    outbox.claimFeeCorrectionOutbox.mockResolvedValue({ claim_token: "fee-claim", payload: {
      accountId: "account-1", externalFillId: "fill-1", revision: 2, previousFee: "5.00", correctedFee: "6.00",
      effectiveAt: "2026-09-30T02:00:00.000Z", evidenceRef: "fakebroker-fee-correction:order-1:2",
    } });
    const portfolio = { recordAccountFill: vi.fn(), correctAccountFillFee: vi.fn(async () => undefined), resolveAccountReservation: vi.fn() };
    const delivery = new FillOutboxDelivery(outbox, portfolio);
    await expect(delivery.deliverFeeCorrection("fee-event")).resolves.toBe(true);
    expect(portfolio.correctAccountFillFee).toHaveBeenCalledWith("account-1", "fill-1", expect.objectContaining({ revision: 2, previousFee: "5.00", correctedFee: "6.00" }));
    expect(outbox.markFeeCorrectionDelivered).toHaveBeenCalledWith("fee-event", "fee-claim");
  });

  it("keeps a failed fee correction retryable without acknowledging it", async () => {
    const outbox = outboxPort();
    outbox.claimFeeCorrectionOutbox.mockResolvedValue({ claim_token: "fee-claim", payload: { accountId: "account-1", externalFillId: "fill-1", revision: 1, previousFee: "1", correctedFee: "2", effectiveAt: "2026-09-30T02:00:00.000Z", evidenceRef: "fee-1" } });
    const portfolio = { recordAccountFill: vi.fn(), correctAccountFillFee: vi.fn(async () => { throw new Error("portfolio unavailable"); }), resolveAccountReservation: vi.fn() };
    const delivery = new FillOutboxDelivery(outbox, portfolio);
    await expect(delivery.deliverFeeCorrection("fee-event")).resolves.toBe(false);
    expect(outbox.markFeeCorrectionFailed).toHaveBeenCalledWith("fee-event", "fee-claim", "portfolio unavailable");
    expect(outbox.markFeeCorrectionDelivered).not.toHaveBeenCalled();
  });
});
