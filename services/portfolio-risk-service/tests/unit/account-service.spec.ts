import { describe, expect, it, vi } from "vitest";
import type { AccountRepository } from "../../src/ports/account-repository.js";
import { AccountService } from "../../src/application/account-service.js";

describe("AccountService repository port", () => {
  it("uses the repository port for fills and keeps injected failures before persistence", async () => {
    const recordFill = vi.fn().mockResolvedValue({ snapshot: { accountId: "account-1" }, replayed: false });
    const service = new AccountService({ recordFill } as unknown as AccountRepository);
    service.injectFillFailures(1);

    expect(() => service.recordFill({ accountId: "account-1" } as never)).toThrow("INJECTED_LEDGER_UNAVAILABLE");
    expect(recordFill).not.toHaveBeenCalled();

    await expect(service.recordFill({ accountId: "account-1" } as never)).resolves.toMatchObject({ replayed: false });
    expect(recordFill).toHaveBeenCalledTimes(1);
  });
});
