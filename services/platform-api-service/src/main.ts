import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule, PlatformContainer } from "./bootstrap/app.module.js";
import { startTemporalRuntime } from "./integration/temporal-runtime.js";
import { isV24QuoteSourceUseConfigured } from "./application/v24-live-observation.js";

async function bootstrap() {
  if (process.env.STOCKQUANT_LIVE_TRADING_ENABLED !== "false" || process.env.STOCKQUANT_BROKER_MODE !== "FAKE") {
    throw new Error("V1.1 refuses LIVE trading or non-FAKE broker mode");
  }
  if (process.env.STOCKQUANT_V24_AUTO_START === "true" && !isV24QuoteSourceUseConfigured({
    approved: process.env.STOCKQUANT_V24_QUOTE_SOURCE_USE_APPROVED === "true",
    authorizationRef: process.env.STOCKQUANT_V24_QUOTE_SOURCE_AUTHORIZATION_REF ?? "",
    dataVersion: process.env.STOCKQUANT_V24_QUOTE_DATA_VERSION ?? "",
  })) {
    throw new Error("V2.4 scheduler auto-start requires explicit quote-source approval, authorization reference, and data version");
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ["error", "warn", "log"], bodyParser: false });
  app.useBodyParser("json", { limit: "1mb" });
  if (process.env.STOCKQUANT_TEMPORAL_ADDRESS) {
    await startTemporalRuntime();
  }
  app.enableCors({ origin: ["http://127.0.0.1:5173", "http://127.0.0.1:8080"], credentials: true });
  const container = app.get(PlatformContainer);
  await container.repository.migrate();
  await container.stageRuns.migrate();
  await container.qlibFixtureArtifacts.migrate();
  await container.repository.assertStorageReady();
  await container.migrateV24();
  if (process.env.STOCKQUANT_V24_AUTO_START === "true") {
    await container.scheduler.start();
  }
  await app.listen(Number(process.env.STOCKQUANT_PORT ?? 3000), process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
}

void bootstrap();
