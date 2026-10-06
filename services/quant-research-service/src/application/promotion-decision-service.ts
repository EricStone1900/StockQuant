import { parsePromotionDecisionCommand, promotionVersionFingerprint, reportIsApprovable } from "../domain/promotion-decision.js";
import type { PromotionDecisionRepository, PromotionDecisionRecord } from "../ports/promotion-decision-repository.js";
import { reportMatchesRequest } from "../domain/validation-submission.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class PromotionDecisionService {
  constructor(private readonly repository: PromotionDecisionRepository) {}

  async decide(id: string, input: unknown): Promise<{ status: number; body: unknown }> {
    if (!UUID.test(id)) return { status: 422, body: { status: "REJECTED", reason: "promotionRequestId must be a UUID" } };
    const parsed = parsePromotionDecisionCommand(input);
    if (!parsed.ok) return { status: 422, body: { status: "REJECTED", reason: parsed.reason } };
    const command = parsed.command;
    try {
      return await this.repository.withTransaction(async (transaction) => {
        const parent = await transaction.findRequestForUpdate(id);
        if (!parent) return { status: 404, body: { status: "NOT_FOUND", reason: "PromotionRequest not found" } };
        const stored = await transaction.findReportForUpdate(id);
        if (!stored) return { status: 409, body: { status: "NOT_READY", reason: "immutable validation report is not available" } };
        const request = parent.request;
        const report = stored.report;
        const reportFingerprint = stored.reportFingerprint;
        if (command.reportFingerprint !== reportFingerprint) return { status: 409, body: { status: "CONFLICT", reason: "decision report fingerprint is stale" } };
        if (!reportMatchesRequest(report, request)) return { status: 409, body: { status: "CONFLICT", reason: "report does not match the immutable request version" } };
        if (command.decision === "APPROVE" && !reportIsApprovable(report)) return { status: 422, body: { status: "REJECTED", reason: "only a complete report with all required checks PASS can be approved" } };
        const versionFingerprint = promotionVersionFingerprint(request, parent.requestFingerprint, reportFingerprint);
        const proposed: PromotionDecisionRecord = { decision: command.decision, reportFingerprint, versionFingerprint, actorId: command.actorId, createdAt: new Date() };
        let row = await transaction.createDecision(id, proposed);
        let idempotent = false;
        if (!row) {
          row = await transaction.findDecision(id);
          if (!row) throw new Error("decision raced with a concurrent state change");
          if (row.decision !== command.decision || row.reportFingerprint !== reportFingerprint || row.versionFingerprint !== versionFingerprint || row.actorId !== command.actorId) return { status: 409, body: { status: "CONFLICT", reason: "an immutable decision already exists for this PromotionRequest" } };
          idempotent = true;
        } else if (command.decision === "APPROVE") {
          await transaction.registerApprovedVersion(id, request, versionFingerprint, command.actorId);
        }
        return { status: idempotent ? 200 : 201, body: { schemaVersion: "v3.2-promotion-decision-result-v1", promotionRequestId: id, decision: row.decision, reportFingerprint: row.reportFingerprint, versionFingerprint: row.versionFingerprint, actorId: row.actorId, registryStatus: row.decision === "APPROVE" ? "CANDIDATE_APPROVED" : "NOT_REGISTERED", activation: "DISABLED_UNTIL_MANDATE", createdAt: row.createdAt.toISOString(), idempotent } };
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return { status: 409, body: { status: "CONFLICT", reason: "version fingerprint is already registered" } };
      return { status: 422, body: { status: "REJECTED", reason: error instanceof Error ? error.message : "promotion decision failed" } };
    }
  }
}
