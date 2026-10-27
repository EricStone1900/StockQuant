import { describe, expect, it, vi } from "vitest";
import { V24AcceptanceController } from "../../src/bootstrap/app.module.js";

describe("V2.4 scheduler source authorization gate", () => {
  it("rejects scheduler start and manual tick without source authorization and does not touch the scheduler", async () => {
    const start = vi.fn(async () => ({ status: "RUNNING" }));
    const tick = vi.fn(async () => ({ status: "RUNNING" }));
    const controller = new V24AcceptanceController({
      isV24QuoteSourceUseConfigured: () => false,
      scheduler: { start, tick },
    } as any);

    await expect(controller.schedulerStart("sq_session=acceptance-owner-1", undefined)).rejects.toThrow("without explicit quote-source approval");
    await expect(controller.schedulerTick("sq_session=acceptance-owner-1", undefined)).rejects.toThrow("without explicit quote-source approval");
    expect(start).not.toHaveBeenCalled();
    expect(tick).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers before checking source authorization", async () => {
    const start = vi.fn();
    const controller = new V24AcceptanceController({
      isV24QuoteSourceUseConfigured: () => true,
      scheduler: { start },
    } as any);

    await expect(controller.schedulerStart(undefined, undefined)).rejects.toThrow("local session is required");
    expect(start).not.toHaveBeenCalled();
  });

  it("rejects start and tick when the source is configured but the OD-007 Paper decision is incomplete", async () => {
    const start = vi.fn(async () => ({ status: "RUNNING" }));
    const tick = vi.fn(async () => ({ status: "RUNNING" }));
    const controller = new V24AcceptanceController({
      isV24QuoteSourceUseConfigured: () => true,
      isV24ContinuousPaperUseConfigured: () => false,
      scheduler: { start, tick },
    } as any);

    await expect(controller.schedulerStart("sq_session=acceptance-owner-1", undefined)).rejects.toThrow("approved OD-007 mandate");
    await expect(controller.schedulerTick("sq_session=acceptance-owner-1", undefined)).rejects.toThrow("approved OD-007 mandate");
    expect(start).not.toHaveBeenCalled();
    expect(tick).not.toHaveBeenCalled();
  });

  it("preserves scheduler operations when all explicit source authorization fields are configured", async () => {
    const start = vi.fn(async () => ({ status: "RUNNING" }));
    const tick = vi.fn(async () => ({ status: "RUNNING", tickCount: 1 }));
    const controller = new V24AcceptanceController({
      isV24QuoteSourceUseConfigured: () => true,
      isV24ContinuousPaperUseConfigured: () => true,
      scheduler: { start, tick },
    } as any);

    await expect(controller.schedulerStart("sq_session=acceptance-owner-1", undefined)).resolves.toMatchObject({ accepted: true, scheduler: { status: "RUNNING" } });
    await expect(controller.schedulerTick("sq_session=acceptance-owner-1", undefined)).resolves.toMatchObject({ status: "RUNNING", tickCount: 1 });
    expect(start).toHaveBeenCalledTimes(1);
    expect(tick).toHaveBeenCalledTimes(1);
  });
});
