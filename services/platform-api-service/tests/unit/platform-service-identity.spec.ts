import { afterEach, describe, expect, it, vi } from "vitest";
import { PlatformContainer } from "../../src/bootstrap/app.module.js";

describe("PlatformContainer service identity", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses its canonical Platform API token for Research Automation calls", async () => {
    vi.stubEnv("STOCKQUANT_SERVICE_TOKEN_PLATFORM_API", "platform-api-token-which-is-long-enough");
    vi.stubEnv("STOCKQUANT_RESEARCH_AUTOMATION_TOKEN", "obsolete-duplicate-token-which-is-long-enough");
    const container = new PlatformContainer();

    try {
      expect(container.researchAutomationHeaders({ "content-type": "application/json" })).toEqual({
        "content-type": "application/json",
        "x-stockquant-service-id": "platform-api-service",
        authorization: "Bearer platform-api-token-which-is-long-enough",
      });
    } finally {
      await container.pool.end();
    }
  });
});
