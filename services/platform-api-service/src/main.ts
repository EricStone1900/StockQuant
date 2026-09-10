import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule, PlatformContainer } from "./bootstrap/app.module.js";
import { startTemporalRuntime } from "./integration/temporal-runtime.js";

async function bootstrap() {
  if (process.env.STOCKQUANT_LIVE_TRADING_ENABLED !== "false" || process.env.STOCKQUANT_BROKER_MODE !== "FAKE") {
    throw new Error("V1.1 refuses LIVE trading or non-FAKE broker mode");
  }
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
  if (process.env.STOCKQUANT_TEMPORAL_ADDRESS) {
    await startTemporalRuntime();
  }
  app.enableCors({ origin: ["http://127.0.0.1:5173", "http://127.0.0.1:8080"], credentials: true });
  const container = app.get(PlatformContainer);
  await container.repository.migrate();
  await container.stageRuns.migrate();
  await app.listen(Number(process.env.STOCKQUANT_PORT ?? 3000), process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
}

void bootstrap();
