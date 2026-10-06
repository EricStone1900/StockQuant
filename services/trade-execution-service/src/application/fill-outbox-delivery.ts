import type { FillOutboxPayload } from "../domain/portfolio-fill.js";
import { toPortfolioFillCommand } from "../domain/portfolio-fill.js";
import type { FakeBrokerOutboxPort } from "../ports/fake-broker-outbox.js";
import type { PortfolioFillWriter } from "../ports/portfolio-fill-writer.js";

export class FillOutboxDelivery {
  constructor(private readonly outbox: FakeBrokerOutboxPort, private readonly portfolio: PortfolioFillWriter) {}

  async deliver(eventId: string): Promise<boolean> {
    const claim = await this.outbox.claimOutbox(eventId);
    if (!claim) return false;
    try {
      const fill = claim.payload as FillOutboxPayload & { reservationOutcome?: string };
      await this.portfolio.recordAccountFill(fill.accountId, toPortfolioFillCommand(fill));
      if (fill.reservation && fill.reservationOutcome === "FILLED") {
        const reservation = fill.reservation;
        await this.portfolio.resolveAccountReservation(fill.accountId, reservation.reservationId, {
          namespace: fill.namespace, testRunId: reservation.testRunId, ownerId: reservation.ownerId,
          outcome: "FILLED", evidenceRef: `fakebroker-outbox:${eventId}`,
        });
      }
      await this.outbox.markFillDelivered(eventId, claim.claim_token);
      return true;
    } catch (error) {
      await this.outbox.markFillDeliveryFailed(eventId, claim.claim_token, error instanceof Error ? error.message : "portfolio posting failed");
      return false;
    }
  }

  async deliverReservationResolution(eventId: string): Promise<boolean> {
    const claim = await this.outbox.claimReservationResolutionOutbox(eventId);
    if (!claim) return false;
    try {
      const resolution = claim.payload as { accountId: string; reservationId: string; namespace: string; testRunId: string; ownerId: string; outcome: "CANCELLED"; evidenceRef: string };
      await this.portfolio.resolveAccountReservation(resolution.accountId, resolution.reservationId, {
        namespace: resolution.namespace, testRunId: resolution.testRunId, ownerId: resolution.ownerId,
        outcome: resolution.outcome, evidenceRef: resolution.evidenceRef,
      });
      await this.outbox.markReservationResolutionDelivered(eventId, claim.claim_token);
      return true;
    } catch (error) {
      await this.outbox.markReservationResolutionFailed(eventId, claim.claim_token, error instanceof Error ? error.message : "reservation resolution failed");
      return false;
    }
  }

  async deliverFeeCorrection(eventId: string): Promise<boolean> {
    const claim = await this.outbox.claimFeeCorrectionOutbox(eventId);
    if (!claim) return false;
    try {
      const correction = claim.payload as { accountId: string; externalFillId: string; revision: number; previousFee: string; correctedFee: string; effectiveAt: string; evidenceRef: string };
      await this.portfolio.correctAccountFillFee(correction.accountId, correction.externalFillId, {
        revision: correction.revision, previousFee: correction.previousFee, correctedFee: correction.correctedFee,
        effectiveAt: correction.effectiveAt, evidenceRef: correction.evidenceRef,
      });
      await this.outbox.markFeeCorrectionDelivered(eventId, claim.claim_token);
      return true;
    } catch (error) {
      await this.outbox.markFeeCorrectionFailed(eventId, claim.claim_token, error instanceof Error ? error.message : "portfolio fee correction failed");
      return false;
    }
  }

  async drainPending(): Promise<number> {
    let delivered = 0;
    for (const event of await this.outbox.pendingOutbox()) if (await this.deliver(event.event_id)) delivered += 1;
    for (const event of await this.outbox.pendingReservationResolutionOutbox()) if (await this.deliverReservationResolution(event.event_id)) delivered += 1;
    for (const event of await this.outbox.pendingFeeCorrectionOutbox()) if (await this.deliverFeeCorrection(event.event_id)) delivered += 1;
    return delivered;
  }
}
