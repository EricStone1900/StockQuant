export interface FakeBrokerOutboxPort {
  pendingOutbox(limit?: number): Promise<Array<{ event_id: string }>>;
  claimOutbox(eventId: string): Promise<{ claim_token: string; payload: unknown } | null>;
  markFillDelivered(eventId: string, claimToken: string): Promise<void>;
  markFillDeliveryFailed(eventId: string, claimToken: string, error: string): Promise<void>;
  pendingFeeCorrectionOutbox(limit?: number): Promise<Array<{ event_id: string }>>;
  claimFeeCorrectionOutbox(eventId: string): Promise<{ claim_token: string; payload: unknown } | null>;
  markFeeCorrectionDelivered(eventId: string, claimToken: string): Promise<void>;
  markFeeCorrectionFailed(eventId: string, claimToken: string, error: string): Promise<void>;
  pendingReservationResolutionOutbox(limit?: number): Promise<Array<{ event_id: string }>>;
  claimReservationResolutionOutbox(eventId: string): Promise<{ claim_token: string; payload: unknown } | null>;
  markReservationResolutionDelivered(eventId: string, claimToken: string): Promise<void>;
  markReservationResolutionFailed(eventId: string, claimToken: string, error: string): Promise<void>;
}
