import { describe, expect, it, vi } from "vitest";
import { ValidationReportService } from "../../src/application/validation-report-service.js";

const id = "11111111-1111-4111-8111-111111111111";
describe("ValidationReportService", () => {
  it("projects validation input through the repository port", async () => {
    const repository = {
      findRequest: vi.fn().mockResolvedValue({ promotionRequestId: id, requestFingerprint: "a".repeat(64), request: { testRunId: "run" } }),
      findReport: vi.fn(), saveImmutable: vi.fn(),
    };
    await expect(new ValidationReportService(repository).getInput(id)).resolves.toMatchObject({ status: 200, body: { schemaVersion: "v3.2-independent-validation-input-v1", promotionRequestId: id } });
  });

  it("rejects malformed identities and invalid report input before persistence", async () => {
    const repository = { findRequest: vi.fn(), findReport: vi.fn(), saveImmutable: vi.fn() };
    const service = new ValidationReportService(repository);
    await expect(service.submit("bad-id", {})).resolves.toMatchObject({ status: 422 });
    await expect(service.submit(id, {})).resolves.toMatchObject({ status: 422 });
    expect(repository.saveImmutable).not.toHaveBeenCalled();
  });
});
