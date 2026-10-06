import type { FillFeeCorrectionCommand, ReservedFillCommand } from "../contracts/generated-types.js";

export interface PortfolioFillWriter {
  recordAccountFill(accountId: string, body: ReservedFillCommand): Promise<unknown>;
  correctAccountFillFee(accountId: string, externalFillId: string, body: FillFeeCorrectionCommand): Promise<unknown>;
  resolveAccountReservation(accountId: string, reservationId: string, body: {
    namespace: string; testRunId: string; ownerId: string;
    outcome: "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED" | "UNKNOWN"; evidenceRef: string;
  }): Promise<unknown>;
}
